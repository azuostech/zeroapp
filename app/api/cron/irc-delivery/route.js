import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { processNextIrcDelivery } from '@/src/modules/irc/application/irc-delivery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await processNextIrcDelivery(getServiceSupabase());
    return NextResponse.json(result, { status: result.ok === false ? (result.status || 500) : 200 });
  } catch (error) {
    console.error('[cron/irc-delivery] failed:', error?.message || error);
    return NextResponse.json({ error: 'irc_delivery_cron_failed' }, { status: 500 });
  }
}
