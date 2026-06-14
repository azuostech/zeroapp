import { NextResponse } from 'next/server';
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
    if (fetchError) console.error('[Webhook Resend] lookup failed:', fetchError.message || fetchError);
    return;
  }

  const patch = updater(current);
  if (!patch || Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from('email_logs')
    .update(patch)
    .eq('id', current.id);

  if (error) {
    console.error('[Webhook Resend] update failed:', error.message || error);
  }
}

export async function POST(request) {
  try {
    const svixId = request.headers.get('svix-id');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixSignature) {
      return NextResponse.json({ error: 'missing_headers' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const type = String(body?.type || '').trim();
    const data = body?.data || {};
    const resendId = resolveResendId(data);

    if (!resendId) {
      return NextResponse.json({ received: true });
    }

    const supabase = getServiceSupabase();
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook Resend]', error);
    return NextResponse.json({ received: true, warning: 'processing_error' });
  }
}
