import { NextResponse } from 'next/server';
import { requireAdminDiagnosticsAccess } from '@/src/modules/admin/application/admin-diagnostics';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  const auth = await requireAdminDiagnosticsAccess();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const diagnosticId = String(id || '').trim();
  if (!diagnosticId) return NextResponse.json({ error: 'diagnostic_id_required' }, { status: 400 });

  const { data: diagnostic, error } = await auth.service
    .from('irc_diagnostics')
    .select('id,user_id,pdf_path,pdf_status')
    .eq('id', diagnosticId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'pdf_lookup_failed' }, { status: 500 });
  if (!diagnostic?.pdf_path || diagnostic.pdf_status !== 'ready') {
    return NextResponse.json({ error: 'pdf_not_ready' }, { status: 404 });
  }

  const expectedPrefix = `${diagnostic.user_id}/${diagnostic.id}`;
  if (!diagnostic.pdf_path.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'invalid_pdf_path' }, { status: 403 });
  }

  const { data, error: downloadError } = await auth.service.storage
    .from('irc-reports')
    .download(diagnostic.pdf_path);
  if (downloadError) return NextResponse.json({ error: 'pdf_download_failed' }, { status: 500 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="diagnostico-${diagnostic.id}.pdf"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
