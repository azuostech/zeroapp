import { NextResponse } from 'next/server';
import {
  profilesById,
  requireAdminDiagnosticsAccess,
  serializeAdminDiagnostic
} from '@/src/modules/admin/application/admin-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set([
  'not_started',
  'in_progress',
  'answers_completed',
  'generating_report',
  'report_ready',
  'generation_failed'
]);

function positiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function searchText(value) {
  return String(value || '').trim().replace(/[%(),]/g, '').slice(0, 100);
}

async function matchingUserIds(service, search) {
  if (!search) return null;
  const pattern = `%${search}%`;
  const { data, error } = await service
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(500);
  if (error) throw error;
  return (data || []).map((profile) => profile.id);
}

function metrics(rows) {
  const statuses = rows || [];
  return {
    total: statuses.length,
    ready: statuses.filter((item) => item.status === 'report_ready').length,
    in_progress: statuses.filter((item) => ['in_progress', 'answers_completed', 'generating_report'].includes(item.status)).length,
    failed: statuses.filter((item) => item.status === 'generation_failed').length
  };
}

export async function GET(request) {
  const auth = await requireAdminDiagnosticsAccess();
  if (!auth.ok) return auth.response;

  const page = positiveInt(request.nextUrl.searchParams.get('page'), 1, 10000);
  const limit = positiveInt(request.nextUrl.searchParams.get('limit'), 20, 100);
  const statusParam = String(request.nextUrl.searchParams.get('status') || '').trim();
  const status = VALID_STATUSES.has(statusParam) ? statusParam : '';
  const search = searchText(request.nextUrl.searchParams.get('search'));
  const userIds = await matchingUserIds(auth.service, search);

  const { data: allStatuses, error: metricsError } = await auth.service
    .from('irc_diagnostics')
    .select('status');
  if (metricsError) {
    console.error('[admin/diagnostics] metrics failed:', metricsError.message || metricsError);
  }

  if (userIds && !userIds.length) {
    return NextResponse.json({ diagnostics: [], total: 0, page, limit, pages: 1, metrics: metrics(allStatuses) });
  }

  const offset = (page - 1) * limit;
  let query = auth.service
    .from('irc_diagnostics')
    .select(
      'id,user_id,status,current_domain,current_stage,report_generated_at,pdf_path,pdf_status,email_status,email_sent_at,generation_attempts,last_error,created_at,updated_at',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (userIds) query = query.in('user_id', userIds);

  const { data, error, count } = await query;
  if (error) {
    console.error('[admin/diagnostics] list failed:', error.message || error);
    return NextResponse.json({ error: 'diagnostics_query_failed' }, { status: 500 });
  }

  const profiles = await profilesById(auth.service, (data || []).map((item) => item.user_id));
  const total = Number(count || 0);
  return NextResponse.json({
    diagnostics: (data || []).map((item) => serializeAdminDiagnostic(item, profiles.get(item.user_id) || null)),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    metrics: metrics(allStatuses)
  });
}
