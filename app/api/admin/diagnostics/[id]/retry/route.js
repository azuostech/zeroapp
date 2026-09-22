import { NextResponse } from 'next/server';
import { requireAdminDiagnosticsAccess } from '@/src/modules/admin/application/admin-diagnostics';

export const runtime = 'nodejs';

export async function POST(_request, { params }) {
  const auth = await requireAdminDiagnosticsAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const diagnosticId = String(id || '').trim();
  if (!diagnosticId) return NextResponse.json({ error: 'diagnostic_id_required' }, { status: 400 });

  const { data: diagnostic, error: queryError } = await auth.service
    .from('irc_diagnostics')
    .select('id,status,pdf_path,pdf_status,email_sent_at,email_status,visual_status')
    .eq('id', diagnosticId)
    .maybeSingle();
  if (queryError) return NextResponse.json({ error: 'diagnostic_query_failed' }, { status: 500 });
  if (!diagnostic) return NextResponse.json({ error: 'diagnostic_not_found' }, { status: 404 });
  if (diagnostic.status !== 'report_ready') {
    return NextResponse.json({ error: 'report_not_ready' }, { status: 409 });
  }

  const pdfReady = Boolean(diagnostic.pdf_path && diagnostic.pdf_status === 'ready');
  const emailSent = Boolean(diagnostic.email_sent_at || diagnostic.email_status === 'sent');
  const { error } = await auth.service
    .from('irc_diagnostics')
    .update({
      ...(pdfReady ? {} : { pdf_status: 'pending' }),
      ...(emailSent ? {} : { email_status: 'pending' }),
      ...(diagnostic.visual_status === 'failed' ? { visual_status: 'pending' } : {}),
      delivery_attempts: 0,
      delivery_next_attempt_at: null,
      delivery_started_at: null,
      last_error: null
    })
    .eq('id', diagnosticId);
  if (error) return NextResponse.json({ error: 'diagnostic_retry_failed' }, { status: 500 });
  return NextResponse.json({ queued: true });
}
