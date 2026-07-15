import { NextResponse } from 'next/server';
import { getResendClient } from '@/src/lib/email/resend-client';
import { getServiceSupabase } from '@/src/lib/supabase/service';

export const runtime = 'nodejs';

function resolveResendId(data) {
  return String(data?.email_id || data?.id || '').trim();
}

function resolveEventAt(data) {
  const candidate = data?.created_at || data?.timestamp;
  const date = candidate ? new Date(candidate) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

async function updateByResendId(supabase, resendId, updater) {
  const { data: current, error: fetchError } = await supabase
    .from('email_logs')
    .select('id,status,opened_at,clicked_at,open_count,click_count')
    .eq('resend_id', resendId)
    .maybeSingle();

  if (fetchError || !current) {
    if (fetchError) throw fetchError;
    return;
  }

  const patch = updater(current);
  if (!patch || Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from('email_logs')
    .update(patch)
    .eq('id', current.id);

  if (error) {
    throw error;
  }
}

async function claimEvent(supabase, svixId, eventType) {
  const { error } = await supabase.from('resend_webhook_events').insert({
    svix_id: svixId,
    event_type: eventType || null,
    status: 'processing'
  });

  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}

async function completeEvent(supabase, svixId) {
  const { error } = await supabase
    .from('resend_webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('svix_id', svixId);
  if (error) throw error;
}

async function releaseEvent(supabase, svixId) {
  const { error } = await supabase
    .from('resend_webhook_events')
    .delete()
    .eq('svix_id', svixId)
    .eq('status', 'processing');
  if (error) console.error('[Webhook Resend] claim release failed:', error.message || error);
}

export async function POST(request) {
  const webhookSecret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    console.error('[Webhook Resend] RESEND_WEBHOOK_SECRET ausente');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing_signature_headers' }, { status: 401 });
  }

  const rawBody = await request.text();
  let body;
  try {
    const resend = getResendClient();
    if (!resend) throw new Error('resend_not_configured');
    body = await resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature
      },
      webhookSecret
    });
  } catch (_) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const type = String(body?.type || '').trim();
  const data = body?.data || {};
  const resendId = resolveResendId(data);
  const supabase = getServiceSupabase();
  let claimed = false;

  try {
    claimed = await claimEvent(supabase, svixId, type);
    if (!claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (!resendId) {
      await completeEvent(supabase, svixId);
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();
    const eventAt = resolveEventAt(data);

    if (type === 'email.opened') {
      await updateByResendId(supabase, resendId, (current) => ({
        opened_at: current.opened_at || eventAt,
        open_count: Number(current.open_count || 0) + 1,
        last_event_at: now,
        status: 'opened'
      }));
    } else if (type === 'email.clicked') {
      await updateByResendId(supabase, resendId, (current) => ({
        opened_at: current.opened_at || eventAt,
        clicked_at: current.clicked_at || eventAt,
        open_count: Number(current.open_count || 0) || 1,
        click_count: Number(current.click_count || 0) + 1,
        last_event_at: now,
        status: 'clicked'
      }));
    } else if (type === 'email.bounced') {
      await updateByResendId(supabase, resendId, () => ({
        last_event_at: now,
        status: 'bounced'
      }));
    } else if (type === 'email.delivered') {
      await updateByResendId(supabase, resendId, (current) => {
        const currentStatus = String(current.status || '').toLowerCase();
        if (['opened', 'clicked', 'bounced'].includes(currentStatus)) {
          return { last_event_at: now };
        }
        return {
          last_event_at: now,
          status: 'delivered'
        };
      });
    } else if (type === 'email.sent') {
      await updateByResendId(supabase, resendId, (current) => {
        const currentStatus = String(current.status || '').toLowerCase();
        if (currentStatus && currentStatus !== 'sent') return { last_event_at: now };
        return {
          last_event_at: now,
          status: 'sent'
        };
      });
    }

    await completeEvent(supabase, svixId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook Resend]', error);
    if (claimed) await releaseEvent(supabase, svixId);
    return NextResponse.json({ error: 'processing_error' }, { status: 500 });
  }
}
