import { NextResponse } from 'next/server';
import { getIrcRequestContext } from '@/src/modules/irc/application/irc-access';
import { buildIrcPdf } from '@/src/modules/irc/application/irc-pdf';
import { generateIrcVisualAssets } from '@/src/modules/irc/application/irc-visuals';
import { sendEmail } from '@/src/lib/email/email-service';
import { ircReportReadyEmail } from '@/src/lib/email/templates/irc-report-ready';

export const runtime = 'nodejs';
export const maxDuration = 300;

function safeDeliveryError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('.afm') || message.includes('font')) return 'pdf_assets_missing';
  if (message.includes('bucket') || message.includes('storage') || message.includes('upload')) return 'pdf_upload_failed';
  return 'delivery_failed';
}

async function downloadVisuals(service, visualAssets) {
  const files = visualAssets?.files;
  if (!files || typeof files !== 'object') return {};
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => {
    if (!path) return null;
    const { data, error } = await service.storage.from('irc-reports').download(path);
    if (error || !data) return null;
    return [key, Buffer.from(await data.arrayBuffer())];
  }));
  return Object.fromEntries(entries.filter(Boolean));
}

async function prepareVisuals(context, diagnostic) {
  if (diagnostic.visual_status === 'ready') {
    const stored = await downloadVisuals(context.service, diagnostic.visual_assets);
    if (Object.keys(stored).length === 3) return stored;
  }

  await context.service
    .from('irc_diagnostics')
    .update({ visual_status: 'generating', visual_last_error: null })
    .eq('id', diagnostic.id);

  try {
    const generated = await generateIrcVisualAssets({
      answers: diagnostic.answers,
      diagnosticId: diagnostic.id,
      userId: context.user.id
    });
    const promptMetadata = Object.fromEntries(generated.specs.map((item) => [item.key, {
      prompt: item.prompt,
      size: item.size
    }]));

    if (generated.fallback) {
      await context.service
        .from('irc_diagnostics')
        .update({
          visual_status: 'fallback',
          visual_version: generated.version,
          visual_model: null,
          visual_assets: { files: {}, prompts: promptMetadata },
          visual_last_error: 'openai_image_not_configured'
        })
        .eq('id', diagnostic.id);
      return {};
    }

    const files = {};
    const buffers = {};
    for (const asset of generated.assets) {
      const storagePath = `${context.user.id}/${diagnostic.id}/visuals/${asset.key}.png`;
      const { error } = await context.service.storage
        .from('irc-reports')
        .upload(storagePath, asset.buffer, { contentType: asset.mimeType, upsert: true });
      if (error) throw error;
      files[asset.key] = storagePath;
      buffers[asset.key] = asset.buffer;
    }

    await context.service
      .from('irc_diagnostics')
      .update({
        visual_status: 'ready',
        visual_version: generated.version,
        visual_model: generated.model,
        visual_assets: { files, prompts: promptMetadata },
        visuals_generated_at: new Date().toISOString(),
        visual_last_error: null
      })
      .eq('id', diagnostic.id);
    return buffers;
  } catch (error) {
    console.error('[irc/deliver] personalized visuals failed, using vector fallback:', error?.message || error);
    await context.service
      .from('irc_diagnostics')
      .update({ visual_status: 'fallback', visual_last_error: 'personalized_visuals_failed' })
      .eq('id', diagnostic.id);
    return {};
  }
}

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

      const visuals = await prepareVisuals(context, diagnostic);
      pdfBuffer = await buildIrcPdf({
        name: context.profile.full_name || context.profile.email,
        report: diagnostic.report,
        answers: diagnostic.answers,
        generatedAt: diagnostic.report_generated_at,
        visuals
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
    const safeError = safeDeliveryError(error);
    console.error('[irc/deliver] failed:', safeError, error?.message || error);
    if (context?.service && diagnostic?.id) {
      await context.service
        .from('irc_diagnostics')
        .update({
          ...(diagnostic.pdf_status !== 'ready' ? { pdf_status: 'failed' } : {}),
          ...(diagnostic.email_sent_at ? {} : { email_status: 'failed' }),
          last_error: safeError
        })
        .eq('id', diagnostic.id);
    }
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
