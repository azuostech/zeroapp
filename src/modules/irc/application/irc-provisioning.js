import 'server-only';
import crypto from 'node:crypto';
import { sendEmail } from '@/src/lib/email/email-service';
import { ircAccessEmail } from '@/src/lib/email/templates/irc-access';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { IRC_PRODUCT_CODE, IRC_SOURCE, IRC_TURMA } from '@/src/modules/irc/domain/irc-domains';
import { parseKiwifyIrcEvent } from '@/src/modules/irc/domain/kiwify-event';

function siteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.tech').replace(/\/+$/, '');
}

function passwordRedirectUrl() {
  return `${siteUrl()}/auth/reset-password?next=${encodeURIComponent('/diagnostico-completo')}`;
}

function checkoutCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).pathname.split('/').filter(Boolean).pop() || '';
  } catch (_) {
    return raw.split('/').filter(Boolean).pop() || raw;
  }
}

function addTurma(value, requiredTurma) {
  const current = String(value || '')
    .split(/[;,]/)
    .map((turma) => turma.trim())
    .filter(Boolean);
  const required = String(requiredTurma || '').trim();
  if (!required) return current.join(', ');
  if (current.some((turma) => turma.toLocaleLowerCase('pt-BR') === required.toLocaleLowerCase('pt-BR'))) {
    return current.join(', ');
  }
  return [...current, required].join(', ');
}

async function createInvitedUser(service, event) {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'invite',
    email: event.email,
    options: {
      redirectTo: passwordRedirectUrl(),
      data: {
        full_name: event.name,
        phone: event.phone,
        signup_source: 'chatquiz_irc'
      }
    }
  });
  if (error || !data?.user?.id) throw error || new Error('invite_generation_failed');
  return {
    userId: data.user.id,
    inviteUrl: data.properties?.action_link || '',
    isNewUser: true
  };
}

async function createPasswordSetupLink(service, email) {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: passwordRedirectUrl() }
  });
  if (error) throw error;
  return data?.properties?.action_link || '';
}

async function findOrCreateUser(service, event) {
  const { data: profile, error } = await service
    .from('profiles')
    .select('id,email,full_name,phone,status,tier,turma')
    .ilike('email', event.email)
    .maybeSingle();
  if (error) throw error;
  if (profile) return { userId: profile.id, profile, inviteUrl: '', isNewUser: false };

  const invited = await createInvitedUser(service, event);
  return { ...invited, profile: null };
}

async function claimEvent(service, event, payloadHash) {
  const { data, error } = await service
    .from('commerce_webhook_events')
    .insert({
      provider: 'kiwify',
      event_id: event.eventId,
      event_type: event.eventType,
      product_code: IRC_PRODUCT_CODE,
      purchase_id: event.purchaseId,
      payload_hash: payloadHash,
      status: 'processing'
    })
    .select('*')
    .maybeSingle();

  if (!error) return { claimed: true, row: data };
  if (error.code !== '23505') throw error;

  const { data: existing } = await service
    .from('commerce_webhook_events')
    .select('*')
    .eq('provider', 'kiwify')
    .eq('event_id', event.eventId)
    .maybeSingle();
  if (['processed', 'ignored'].includes(existing?.status)) {
    return { claimed: false, row: existing };
  }
  if (existing?.payload_hash && existing.payload_hash !== payloadHash) {
    throw new Error('event_payload_mismatch');
  }
  if (existing?.status === 'failed') {
    const { data: retried, error: retryError } = await service
      .from('commerce_webhook_events')
      .update({
        status: 'processing',
        attempts: Number(existing.attempts || 1) + 1,
        last_error: null
      })
      .eq('id', existing.id)
      .eq('status', 'failed')
      .select('*')
      .maybeSingle();
    if (retryError) throw retryError;
    if (retried) return { claimed: true, row: retried };
  }
  return { claimed: false, row: existing };
}

export async function provisionIrcPurchase(payload) {
  const event = parseKiwifyIrcEvent(payload);
  if (!event.purchaseId || !event.eventId) return { ok: false, status: 400, error: 'missing_purchase_id' };
  if (!event.accessStatus) return { ok: true, ignored: true, reason: 'unsupported_event' };

  const allowedProductIds = String(process.env.KIWIFY_IRC_PRODUCT_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedCheckoutLinks = String(
    process.env.KIWIFY_IRC_CHECKOUT_LINKS || process.env.NEXT_PUBLIC_IRC_CHECKOUT_URL || ''
  )
    .split(',')
    .map(checkoutCode)
    .filter(Boolean);
  if (!allowedProductIds.length && !allowedCheckoutLinks.length) {
    return { ok: false, status: 503, error: 'irc_product_not_configured' };
  }
  const matchesProduct = Boolean(event.productId && allowedProductIds.includes(event.productId));
  const matchesCheckout = Boolean(event.checkoutLink && allowedCheckoutLinks.includes(checkoutCode(event.checkoutLink)));
  if (!matchesProduct && !matchesCheckout) {
    return { ok: false, status: 422, error: 'unexpected_product' };
  }

  const service = getServiceSupabase();
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const claim = await claimEvent(service, event, payloadHash);
  if (!claim.claimed && ['processed', 'ignored'].includes(claim.row?.status)) {
    return { ok: true, idempotent: true, status: claim.row.status };
  }
  if (!claim.claimed) {
    return { ok: true, idempotent: true, processing: claim.row?.status === 'processing' };
  }

  const eventRowId = claim.row.id;
  try {
    if (event.accessStatus !== 'active') {
      const { data: access, error } = await service
        .from('product_access')
        .update({
          status: event.accessStatus,
          revoked_at: new Date().toISOString(),
          metadata: { last_event_id: event.eventId, last_event_type: event.eventType }
        })
        .eq('source', IRC_SOURCE)
        .eq('purchase_id', event.purchaseId)
        .eq('product_code', IRC_PRODUCT_CODE)
        .select('id,user_id,status')
        .maybeSingle();
      if (error) throw error;

      await service
        .from('commerce_webhook_events')
        .update({ status: access ? 'processed' : 'ignored', processed_at: new Date().toISOString() })
        .eq('id', eventRowId);
      return { ok: true, revoked: Boolean(access), access_status: event.accessStatus };
    }

    if (!event.email) throw new Error('missing_buyer_email');
    const { data: previousAccess } = await service
      .from('product_access')
      .select('id,user_id,metadata')
      .eq('source', IRC_SOURCE)
      .eq('purchase_id', event.purchaseId)
      .eq('product_code', IRC_PRODUCT_CODE)
      .maybeSingle();
    const account = await findOrCreateUser(service, event);
    if (!account.isNewUser && previousAccess?.metadata?.account_created) {
      account.inviteUrl = await createPasswordSetupLink(service, event.email);
      account.isNewUser = true;
    }
    const { data: updatedProfile, error: profileError } = await service
      .from('profiles')
      .update({
        email: event.email,
        full_name: account.profile?.full_name || event.name || null,
        phone: account.profile?.phone || event.phone || null,
        status: 'active',
        tier: account.profile?.tier || 'DESPERTAR',
        turma: addTurma(account.profile?.turma, IRC_TURMA)
      })
      .eq('id', account.userId)
      .select('id,email,full_name,phone,status,tier,turma')
      .single();
    if (profileError) throw profileError;

    const { data: access, error: accessError } = await service
      .from('product_access')
      .upsert(
        {
          user_id: account.userId,
          product_code: IRC_PRODUCT_CODE,
          purchase_id: event.purchaseId,
          status: 'active',
          source: IRC_SOURCE,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          metadata: {
            product_id: event.productId,
            event_id: event.eventId,
            account_created: Boolean(account.isNewUser || previousAccess?.metadata?.account_created)
          }
        },
        { onConflict: 'source,purchase_id,product_code' }
      )
      .select('id,status')
      .single();
    if (accessError) throw accessError;

    const { error: tagError } = await service
      .from('user_tags')
      .upsert({ user_id: account.userId, tag: 'ChatQuiz', source: IRC_SOURCE }, { onConflict: 'user_id,tag', ignoreDuplicates: true });
    if (tagError) throw tagError;

    const emailType = account.isNewUser ? 'irc_access_invite' : 'irc_access_granted';
    const { data: existingEmail } = await service
      .from('email_logs')
      .select('id')
      .eq('user_id', account.userId)
      .eq('status', 'sent')
      .in('email_type', ['irc_access_invite', 'irc_access_granted'])
      .contains('email_snapshot', { purchase_id: event.purchaseId })
      .limit(1)
      .maybeSingle();
    if (!existingEmail) {
      const template = ircAccessEmail({
        name: updatedProfile.full_name || event.name,
        inviteUrl: account.inviteUrl,
        isNewUser: account.isNewUser
      });
      const emailResult = await sendEmail({
        userId: account.userId,
        to: updatedProfile.email,
        subject: template.subject,
        html: template.html,
        emailType,
        emailSnapshot: {
          kind: emailType,
          purchase_id: event.purchaseId,
          product_code: IRC_PRODUCT_CODE
        }
      });
      if (!emailResult.success) throw new Error(`access_email_failed:${emailResult.error}`);
    }

    await service
      .from('commerce_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), last_error: null })
      .eq('id', eventRowId);

    return { ok: true, user_id: account.userId, entitlement_id: access.id, invited: account.isNewUser };
  } catch (error) {
    await service
      .from('commerce_webhook_events')
      .update({ status: 'failed', last_error: String(error?.message || 'processing_failed').slice(0, 200) })
      .eq('id', eventRowId);
    throw error;
  }
}
