import { NextResponse } from 'next/server';
import { sendEmail } from '@/src/lib/email/email-service';
import { zeroAppAccessEmail } from '@/src/lib/email/templates/zeroapp-access';
import {
  WORKSHOP_TIER,
  WORKSHOP_TURMA,
  ZEROAPP_KIWIFY_PRODUCT_ID
} from '@/src/lib/commerce/access-offer';
import { getServiceSupabase } from '@/src/lib/supabase/service';

export const runtime = 'nodejs';

const PAID_MARKERS = [
  'paid',
  'approved',
  'completed',
  'confirmed',
  'payment_approved',
  'order_approved',
  'purchase_approved'
];

const BLOCKED_MARKERS = [
  'refund',
  'refunded',
  'chargeback',
  'cancel',
  'canceled',
  'cancelled',
  'rejected',
  'refused',
  'pending',
  'waiting'
];

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function safeEquals(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function tokenFromAuthorization(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^Bearer\s+/i, '').trim();
}

function resolveRequestToken(request, body) {
  return (
    request.headers.get('x-kiwify-token') ||
    request.headers.get('x-webhook-token') ||
    request.headers.get('x-zeroapp-token') ||
    tokenFromAuthorization(request.headers.get('authorization')) ||
    request.nextUrl.searchParams.get('token') ||
    body?.token ||
    body?.webhook_token ||
    ''
  );
}

function collectStrings(value, output = [], depth = 0) {
  if (depth > 6 || value == null) return output;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    output.push(String(value));
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output, depth + 1));
    return output;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, output, depth + 1));
  }

  return output;
}

function isPaidPayload(payload) {
  const focusedValues = [
    payload?.event,
    payload?.type,
    payload?.status,
    payload?.order_status,
    payload?.payment_status,
    payload?.sale_status,
    payload?.webhook_event_type,
    payload?.data?.event,
    payload?.data?.type,
    payload?.data?.status,
    payload?.data?.order_status,
    payload?.data?.payment_status,
    payload?.data?.sale_status,
    payload?.data?.webhook_event_type,
    payload?.order?.status,
    payload?.order?.payment_status,
    payload?.purchase?.status,
    payload?.transaction?.status
  ].map(normalizeText);

  const joinedFocused = focusedValues.filter(Boolean).join(' ');
  if (BLOCKED_MARKERS.some((marker) => joinedFocused.includes(marker))) {
    return false;
  }

  if (PAID_MARKERS.some((marker) => joinedFocused.includes(marker))) {
    return true;
  }

  const allValues = collectStrings(payload).map(normalizeText).join(' ');
  if (BLOCKED_MARKERS.some((marker) => allValues.includes(marker))) {
    return false;
  }

  return PAID_MARKERS.some((marker) => allValues.includes(marker));
}

function findByKey(value, wantedKeys, validator, depth = 0) {
  if (depth > 7 || value == null) return '';

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findByKey(item, wantedKeys, validator, depth + 1);
      if (found) return found;
    }
    return '';
  }

  if (typeof value !== 'object') return '';

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = normalizeText(key).replace(/[^a-z0-9_]/g, '');
    if (wantedKeys.has(normalizedKey) && (!validator || validator(nested))) {
      return String(nested || '').trim();
    }
  }

  for (const nested of Object.values(value)) {
    const found = findByKey(nested, wantedKeys, validator, depth + 1);
    if (found) return found;
  }

  return '';
}

function resolveBuyerEmail(payload) {
  const direct =
    payload?.customer?.email ||
    payload?.Customer?.email ||
    payload?.buyer?.email ||
    payload?.client?.email ||
    payload?.data?.customer?.email ||
    payload?.data?.buyer?.email ||
    payload?.order?.customer?.email ||
    payload?.email;

  return normalizeEmail(
    direct ||
      findByKey(
        payload,
        new Set(['email', 'customer_email', 'buyer_email', 'client_email']),
        (candidate) => String(candidate || '').includes('@')
      )
  );
}

function resolveBuyerName(payload) {
  const direct =
    payload?.customer?.name ||
    payload?.Customer?.name ||
    payload?.buyer?.name ||
    payload?.client?.name ||
    payload?.data?.customer?.name ||
    payload?.data?.buyer?.name ||
    payload?.order?.customer?.name ||
    payload?.name;

  return String(
    direct ||
      findByKey(
        payload,
        new Set(['name', 'full_name', 'customer_name', 'buyer_name', 'client_name']),
        (candidate) => String(candidate || '').trim().length > 1
      )
  ).trim();
}

function resolveTransactionId(payload) {
  return String(
    payload?.transaction_id ||
      payload?.order_id ||
      payload?.sale_id ||
      payload?.id ||
      payload?.data?.transaction_id ||
      payload?.data?.order_id ||
      payload?.data?.sale_id ||
      payload?.data?.id ||
      findByKey(payload, new Set(['transaction_id', 'order_id', 'sale_id', 'purchase_id']), Boolean)
  ).trim();
}

function resolveProductId(payload) {
  return String(
    payload?.product_id ||
      payload?.product?.id ||
      payload?.Product?.id ||
      payload?.data?.product_id ||
      payload?.data?.product?.id ||
      findByKey(payload, new Set(['product_id']), Boolean)
  ).trim();
}

function allowedProductIds() {
  const configured = String(process.env.KIWIFY_ZEROAPP_PRODUCT_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : [ZEROAPP_KIWIFY_PRODUCT_ID]);
}

function siteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.tech').replace(/\/+$/, '');
}

async function createInvitedUser(service, { email, name }) {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo: `${siteUrl()}/auth/reset-password`,
      data: { full_name: name || null, signup_source: 'kiwify_zeroapp' }
    }
  });
  if (error || !data?.user?.id) throw error || new Error('invite_generation_failed');
  return {
    userId: data.user.id,
    passwordSetupUrl: data.properties?.action_link || '',
    isNewUser: true
  };
}

async function createPasswordSetupLink(service, email) {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl()}/auth/reset-password` }
  });
  if (error) throw error;
  return data?.properties?.action_link || '';
}

function splitTurmas(value) {
  return String(value || '')
    .split(/[;,]/)
    .map((turma) => turma.trim())
    .filter(Boolean);
}

function hasWorkshopTurma(value) {
  return splitTurmas(value).some((turma) => normalizeText(turma) === normalizeText(WORKSHOP_TURMA));
}

function addWorkshopTurma(value) {
  const current = splitTurmas(value);
  if (current.some((turma) => normalizeText(turma) === normalizeText(WORKSHOP_TURMA))) {
    return current.join(', ');
  }
  return [...current, WORKSHOP_TURMA].join(', ');
}

function isWorkshopActive(profile) {
  return hasWorkshopTurma(profile?.turma) && normalizeText(profile?.status) === 'active';
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const expectedToken = process.env.KIWIFY_WEBHOOK_TOKEN || '';
    if (!expectedToken) {
      console.error('[Kiwify webhook] KIWIFY_WEBHOOK_TOKEN ausente');
      return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
    }

    const requestToken = resolveRequestToken(request, body);
    if (!safeEquals(requestToken, expectedToken)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!isPaidPayload(body)) {
      return NextResponse.json({ received: true, ignored: true, reason: 'not_paid_event' });
    }

    const email = resolveBuyerEmail(body);
    if (!email) {
      return NextResponse.json({ received: true, warning: 'missing_buyer_email' }, { status: 202 });
    }

    const buyerName = resolveBuyerName(body);
    const transactionId = resolveTransactionId(body);
    const productId = resolveProductId(body);
    if (!productId || !allowedProductIds().has(productId)) {
      return NextResponse.json({ received: true, ignored: true, reason: 'unexpected_product' });
    }
    const supabase = getServiceSupabase();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,full_name,status,tier,turma')
      .ilike('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('[Kiwify webhook] profile lookup failed:', profileError.message || profileError);
      return NextResponse.json({ received: true, warning: 'profile_lookup_failed' }, { status: 500 });
    }

    let account = { userId: profile?.id, passwordSetupUrl: '', isNewUser: false };
    if (!profile) account = await createInvitedUser(supabase, { email, name: buyerName });

    const currentProfile = profile || {
      id: account.userId,
      email,
      full_name: buyerName,
      status: null,
      tier: null,
      turma: null
    };

    const alreadyActive = isWorkshopActive(currentProfile);
    let updatedProfile = currentProfile;

    if (!alreadyActive) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          email,
          full_name: currentProfile.full_name || buyerName || null,
          turma: addWorkshopTurma(currentProfile.turma),
          tier: currentProfile.tier || WORKSHOP_TIER
        })
        .eq('id', currentProfile.id)
        .select('id,email,full_name,status,tier,turma')
        .maybeSingle();

      if (error) {
        console.error('[Kiwify webhook] profile update failed:', error.message || error);
        return NextResponse.json({ received: true, warning: 'profile_update_failed' }, { status: 500 });
      }

      updatedProfile = data || currentProfile;
    }

    let existingEmail = null;
    let previousInviteFailure = null;
    if (transactionId) {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id,status,email_type')
        .eq('user_id', updatedProfile.id)
        .in('email_type', ['zeroapp_access_invite', 'zeroapp_access_granted'])
        .contains('email_snapshot', { transaction_id: transactionId })
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      existingEmail = (data || []).find((item) => item.status === 'sent') || null;
      previousInviteFailure = (data || []).find(
        (item) => item.status === 'failed' && item.email_type === 'zeroapp_access_invite'
      ) || null;
    }

    if (!account.isNewUser && previousInviteFailure) {
      account = {
        ...account,
        passwordSetupUrl: await createPasswordSetupLink(supabase, email),
        isNewUser: true
      };
    }

    if (!existingEmail) {
      const emailType = account.isNewUser ? 'zeroapp_access_invite' : 'zeroapp_access_granted';
      const template = zeroAppAccessEmail({
        name: updatedProfile.full_name || buyerName,
        email: updatedProfile.email || email,
        passwordSetupUrl: account.passwordSetupUrl
      });

      const emailResult = await sendEmail({
        userId: updatedProfile.id,
        to: updatedProfile.email || email,
        subject: template.subject,
        html: template.html,
        emailType,
        emailSnapshot: {
          kind: emailType,
          transaction_id: transactionId || null,
          product_id: productId,
          buyer_email: email,
          buyer_name: buyerName || null,
          turma: WORKSHOP_TURMA,
          tier: updatedProfile.tier || WORKSHOP_TIER
        }
      });
      if (!emailResult.success) throw new Error(`access_email_failed:${emailResult.error}`);
    }

    return NextResponse.json({
      received: true,
      updated: !alreadyActive,
      already_active: alreadyActive,
      invited: account.isNewUser,
      user_id: updatedProfile.id,
      turma: updatedProfile.turma || WORKSHOP_TURMA,
      tier: updatedProfile.tier || WORKSHOP_TIER
    });
  } catch (error) {
    console.error('[Kiwify webhook]', error);
    return NextResponse.json({ received: true, warning: 'processing_error' }, { status: 500 });
  }
}
