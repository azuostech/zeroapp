import { NextResponse } from 'next/server';
import {
  EMAIL_LOG_COLUMNS,
  fetchProfilesMap,
  parsePositiveInt,
  requireAdminEmailAccess,
  resolveMonthRange,
  serializeEmailLog
} from './email-log-utils';

export const runtime = 'nodejs';

function normalizeFilter(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function sanitizeSearch(value) {
  return String(value || '')
    .trim()
    .replace(/[%(),]/g, '')
    .slice(0, 80);
}

async function findMatchingProfileIds(supabase, search) {
  if (!search) return [];
  const pattern = `%${search}%`;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(200);

  if (error) {
    console.error('[admin/email-logs] search profile lookup failed:', error.message || error);
    return [];
  }

  return (data || []).map((item) => item.id).filter(Boolean);
}

export async function GET(request) {
  const auth = await requireAdminEmailAccess();
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = parsePositiveInt(params.get('page'), 1, { min: 1, max: 10000 });
  const limit = parsePositiveInt(params.get('limit'), 20, { min: 1, max: 100 });
  const offset = (page - 1) * limit;
  const userId = normalizeFilter(params.get('user_id'));
  const emailType = normalizeFilter(params.get('email_type'));
  const status = normalizeFilter(params.get('status'));
  const month = normalizeFilter(params.get('month'));
  const search = sanitizeSearch(params.get('search'));

  let matchingProfileIds = [];
  if (search) {
    matchingProfileIds = await findMatchingProfileIds(auth.supabase, search);
  }

  let query = auth.supabase
    .from('email_logs')
    .select(EMAIL_LOG_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);
  if (emailType) query = query.eq('email_type', emailType);
  if (status) query = query.eq('status', status);

  const range = resolveMonthRange(month);
  if (range) {
    query = query.gte('created_at', range.startIso).lt('created_at', range.endIso);
  }

  if (search) {
    const pattern = `%${search}%`;
    const orParts = [`recipient.ilike.${pattern}`, `subject.ilike.${pattern}`];
    if (matchingProfileIds.length > 0) {
      orParts.push(`user_id.in.(${matchingProfileIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message || 'email_logs_query_failed' }, { status: 500 });
  }

  const profiles = await fetchProfilesMap(
    auth.supabase,
    (data || []).map((log) => log.user_id)
  );

  const logs = (data || []).map((log) => serializeEmailLog(log, profiles.get(log.user_id) || null));
  const total = Number(count || 0);

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit))
  });
}
