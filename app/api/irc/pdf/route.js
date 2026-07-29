import { NextResponse } from 'next/server';
import { getIrcRequestContext } from '@/src/modules/irc/application/irc-access';

export async function GET() {
  const context = await getIrcRequestContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  const { data: diagnostic, error } = await context.service
    .from('irc_diagnostics')
    .select('id,pdf_path,pdf_status')
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'pdf_lookup_failed' }, { status: 500 });
  if (!diagnostic?.pdf_path || diagnostic.pdf_status !== 'ready') {
    return NextResponse.json({ error: 'pdf_not_ready' }, { status: 404 });
  }

  const expectedPrefix = `${context.user.id}/${diagnostic.id}`;
  if (!diagnostic.pdf_path.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'invalid_pdf_path' }, { status: 403 });
  }

  const { data, error: downloadError } = await context.service.storage.from('irc-reports').download(diagnostic.pdf_path);
  if (downloadError) return NextResponse.json({ error: 'pdf_download_failed' }, { status: 500 });
  const buffer = await data.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="diagnostico-completo.pdf"',
      'Cache-Control': 'private, no-store'
    }
  });
}
