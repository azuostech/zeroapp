import { NextResponse } from 'next/server';
import {
  profilesById,
  requireAdminDiagnosticsAccess,
  serializeAdminDiagnostic
} from '@/src/modules/admin/application/admin-diagnostics';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  const auth = await requireAdminDiagnosticsAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const diagnosticId = String(id || '').trim();
  if (!diagnosticId) return NextResponse.json({ error: 'diagnostic_id_required' }, { status: 400 });

  const { data, error } = await auth.service
    .from('irc_diagnostics')
    .select(
      'id,user_id,status,current_domain,current_stage,report,report_generated_at,pdf_path,pdf_status,email_status,email_sent_at,generation_attempts,last_error,created_at,updated_at'
    )
    .eq('id', diagnosticId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'diagnostic_query_failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'diagnostic_not_found' }, { status: 404 });

  const profiles = await profilesById(auth.service, [data.user_id]);
  return NextResponse.json({
    diagnostic: serializeAdminDiagnostic(data, profiles.get(data.user_id) || null, { includeReport: true })
  });
}
