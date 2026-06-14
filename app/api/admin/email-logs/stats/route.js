import { NextResponse } from 'next/server';
import { requireAdminEmailAccess, resolveMonthRange } from '../email-log-utils';

export const runtime = 'nodejs';

function monthKey(value) {
  if (!value) return 'sem-data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sem-data';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function emptyBucket() {
  return {
    sent: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    open_rate: 0,
    click_rate: 0
  };
}

function finalizeBucket(bucket) {
  const sent = Number(bucket.sent || 0);
  return {
    ...bucket,
    open_rate: sent > 0 ? Math.round((Number(bucket.opened || 0) / sent) * 1000) / 10 : 0,
    click_rate: sent > 0 ? Math.round((Number(bucket.clicked || 0) / sent) * 1000) / 10 : 0
  };
}

export async function GET(request) {
  const auth = await requireAdminEmailAccess();
  if (!auth.ok) return auth.response;

  const month = request.nextUrl.searchParams.get('month');
  const range = resolveMonthRange(month);

  let query = auth.supabase
    .from('email_logs')
    .select('id,email_type,status,created_at,sent_at,opened_at,clicked_at,open_count,click_count')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (range) {
    query = query.gte('created_at', range.startIso).lt('created_at', range.endIso);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message || 'email_log_stats_failed' }, { status: 500 });
  }

  const byType = {};
  const byMonth = {};
  let totalSent = 0;
  let totalOpened = 0;
  let totalClicked = 0;
  let bounced = 0;

  for (const log of data || []) {
    const status = String(log.status || '').toLowerCase();
    const wasSent = status !== 'failed';
    const wasOpened = Boolean(log.opened_at || Number(log.open_count || 0) > 0 || status === 'opened' || status === 'clicked');
    const wasClicked = Boolean(log.clicked_at || Number(log.click_count || 0) > 0 || status === 'clicked');
    const wasBounced = status === 'bounced';
    const type = log.email_type || 'unknown';
    const monthGroup = monthKey(log.created_at || log.sent_at);

    if (!byType[type]) byType[type] = emptyBucket();
    if (!byMonth[monthGroup]) byMonth[monthGroup] = { month: monthGroup, ...emptyBucket() };

    if (wasSent) {
      totalSent += 1;
      byType[type].sent += 1;
      byMonth[monthGroup].sent += 1;
    }

    if (wasOpened) {
      totalOpened += 1;
      byType[type].opened += 1;
      byMonth[monthGroup].opened += 1;
    }

    if (wasClicked) {
      totalClicked += 1;
      byType[type].clicked += 1;
      byMonth[monthGroup].clicked += 1;
    }

    if (wasBounced) {
      bounced += 1;
      byType[type].bounced += 1;
      byMonth[monthGroup].bounced += 1;
    }
  }

  const finalizedByType = Object.fromEntries(Object.entries(byType).map(([key, value]) => [key, finalizeBucket(value)]));
  const finalizedByMonth = Object.values(byMonth)
    .map((bucket) => finalizeBucket(bucket))
    .sort((a, b) => String(b.month).localeCompare(String(a.month)));

  return NextResponse.json({
    total_sent: totalSent,
    total_opened: totalOpened,
    total_clicked: totalClicked,
    open_rate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
    click_rate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0,
    bounced,
    by_type: finalizedByType,
    by_month: finalizedByMonth
  });
}
