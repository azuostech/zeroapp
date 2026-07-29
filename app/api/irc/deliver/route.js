import { NextResponse } from 'next/server';
import { getIrcRequestContext } from '@/src/modules/irc/application/irc-access';
import { buildIrcPdf } from '@/src/modules/irc/application/irc-pdf';
import { sendEmail } from '@/src/lib/email/email-service';
import { ircReportReadyEmail } from '@/src/lib/email/templates/irc-report-ready';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  let context;
  let diagnostic;
  try {
    context = await getIrcRequestContext();
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const { data, error } = await context.service
      .from('irc_diagnostics')
      .select('*')
      .eq('user_id', context.user.id)
      .maybeSingle();
    diagnostic = data;
    if (error) throw error;
    if (!diagnostic?.report || diagnostic.status !== 'report_ready') {
      return NextResponse.json({ error: 'report_not_ready' }, { status: 409 });
    }

    let pdfPath = diagnostic.pdf_path;
    let pdfBuffer = null;
    if (!pdfPath || diagnostic.pdf_status !== 'ready') {
      const { data: claimed } = await context.service
        .from('irc_diagnostics')
        .update({ pdf_status: 'generating', delivery_started_at: new Date().toISOString() })
        .eq('id', diagnostic.id)
        .in('pdf_status', ['pending', 'failed'])
        .select('id')
        .maybeSingle();
      if (!claimed) return NextResponse.json({ processing: true }, { status: 202 });

      pdfBuffer = await buildIrcPdf({
        name: context.profile.full_name || context.profile.email,
        report: diagnostic.report,
        generatedAt: diagnostic.report_generated_at
      });
      pdfPath = `${context.user.id}/${diagnostic.id}.pdf`;
      const { error: uploadError } = await context.service.storage
        .from('irc-reports')
        .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      await context.service
        .from('irc_diagnostics')
        .update({ pdf_path: pdfPath, pdf_status: 'ready', pdf_generated_at: new Date().toISOString() })
        .eq('id', diagnostic.id);
    }

    if (!pdfBuffer) {
      const { data: stored, error: downloadError } = await context.service.storage.from('irc-reports').download(pdfPath);
      if (downloadError) throw downloadError;
      pdfBuffer = Buffer.from(await stored.arrayBuffer());
    }

    if (!diagnostic.email_sent_at) {
      const { data: emailClaim } = await context.service
        .from('irc_diagnostics')
        .update({ email_status: 'sending' })
        .eq('id', diagnostic.id)
        .in('email_status', ['pending', 'failed'])
        .select('id')
        .maybeSingle();

      if (emailClaim) {
        const template = ircReportReadyEmail({ name: context.profile.full_name || context.profile.email });
        const result = await sendEmail({
          userId: context.user.id,
          to: context.profile.email || context.user.email,
          subject: template.subject,
          html: template.html,
          emailType: 'irc_report_ready',
          emailSnapshot: { kind: 'irc_report_ready', diagnostic_id: diagnostic.id },
          attachments: [{ filename: 'diagnostico-completo.pdf', content: pdfBuffer }]
        });
        if (!result.success) {
          await context.service.from('irc_diagnostics').update({ email_status: 'failed', last_error: 'report_email_failed' }).eq('id', diagnostic.id);
          return NextResponse.json({ pdf_ready: true, email_status: 'failed' }, { status: 502 });
        }
        await context.service
          .from('irc_diagnostics')
          .update({ email_status: 'sent', email_sent_at: new Date().toISOString(), last_error: null })
          .eq('id', diagnostic.id);
      }
    }

    return NextResponse.json({ pdf_ready: true, email_status: 'sent' });
  } catch (error) {
    console.error('[irc/deliver] failed:', error?.message || error);
    if (context?.service && diagnostic?.id) {
      await context.service
        .from('irc_diagnostics')
        .update({
          ...(diagnostic.pdf_status !== 'ready' ? { pdf_status: 'failed' } : {}),
          ...(diagnostic.email_sent_at ? {} : { email_status: 'failed' }),
          last_error: 'delivery_failed'
        })
        .eq('id', diagnostic.id);
    }
    return NextResponse.json({ error: 'delivery_failed' }, { status: 500 });
  }
}
