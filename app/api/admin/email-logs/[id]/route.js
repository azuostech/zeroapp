import { NextResponse } from 'next/server';
import { EMAIL_LOG_COLUMNS, fetchProfilesMap, requireAdminEmailAccess, serializeEmailLog } from '../email-log-utils';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  const auth = await requireAdminEmailAccess();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const logId = String(id || '').trim();

  if (!logId) {
    return NextResponse.json({ error: 'log_id_required' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('email_logs')
    .select(EMAIL_LOG_COLUMNS)
    .eq('id', logId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || 'email_log_query_failed' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'email_log_not_found' }, { status: 404 });
  }

  const profiles = await fetchProfilesMap(auth.supabase, [data.user_id]);

  return NextResponse.json({
    log: serializeEmailLog(data, profiles.get(data.user_id) || null)
  });
}
