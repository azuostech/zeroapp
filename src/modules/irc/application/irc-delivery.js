import 'server-only';
import { buildIrcPdf } from './irc-pdf';
import { generateIrcVisualAssets } from './irc-visuals';
import { sendEmail } from '../../../lib/email/email-service';
import { ircReportReadyEmail } from '../../../lib/email/templates/irc-report-ready';
import {
  IRC_DELIVERY_MAX_ATTEMPTS,
  IRC_DELIVERY_STALE_MINUTES,
  nextIrcDeliveryAttempt,
  safeIrcDeliveryError
} from './irc-delivery-policy';

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

async function prepareVisuals({ service, userId, diagnostic }) {
  if (diagnostic.visual_status === 'ready') {
    const stored = await downloadVisuals(service, diagnostic.visual_assets);
    if (Object.keys(stored).length === 3) return stored;
  }

  await service
    .from('irc_diagnostics')
    .update({ visual_status: 'generating', visual_last_error: null })
    .eq('id', diagnostic.id);

  try {
    const generated = await generateIrcVisualAssets({
      answers: diagnostic.answers,
      diagnosticId: diagnostic.id,
      userId
    });
    const promptMetadata = Object.fromEntries(generated.specs.map((item) => [item.key, {
      prompt: item.prompt,
      size: item.size
    }]));

    if (generated.fallback) {
      await service
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
      const storagePath = `${userId}/${diagnostic.id}/visuals/${asset.key}.png`;
      const { error } = await service.storage
        .from('irc-reports')
        .upload(storagePath, asset.buffer, { contentType: asset.mimeType, upsert: true });
      if (error) throw error;
      files[asset.key] = storagePath;
      buffers[asset.key] = asset.buffer;
    }

    await service
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
    console.error('[irc/delivery] personalized visuals failed, using vector fallback:', error?.message || error);
    await service
      .from('irc_diagnostics')
      .update({ visual_status: 'fallback', visual_last_error: 'personalized_visuals_failed' })
      .eq('id', diagnostic.id);
    return {};
  }
}

async function markDeliveryFailure(service, diagnosticId, payload, attempts) {
  await service
    .from('irc_diagnostics')
    .update({
      ...payload,
      delivery_next_attempt_at: nextIrcDeliveryAttempt(attempts),
      last_error: payload.last_error || 'delivery_failed'
    })
    .eq('id', diagnosticId);
}

export async function deliverIrcDiagnostic({ service, diagnostic, profile }) {
  if (!diagnostic?.report || diagnostic.status !== 'report_ready') {
    return { ok: false, status: 409, error: 'report_not_ready' };
  }

  const userId = diagnostic.user_id;
  const recipient = profile?.email;
  const displayName = profile?.full_name || recipient;
  let pdfPath = diagnostic.pdf_path;
  let pdfBuffer = null;
  let pdfReady = Boolean(pdfPath && diagnostic.pdf_status === 'ready');
  let attempts = Number(diagnostic.delivery_attempts || 0);
  let generatedPdfThisRun = false;

  try {
    if (!pdfReady) {
      if (diagnostic.pdf_status === 'generating') return { ok: true, processing: true };
      attempts += 1;
      const now = new Date().toISOString();
      const { data: claimed, error: claimError } = await service
        .from('irc_diagnostics')
        .update({
          pdf_status: 'generating',
          delivery_started_at: now,
          delivery_last_attempt_at: now,
          delivery_attempts: attempts,
          delivery_next_attempt_at: null,
          last_error: null
        })
        .eq('id', diagnostic.id)
        .eq('pdf_status', diagnostic.pdf_status)
        .select('id')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return { ok: true, processing: true };

      const visuals = await prepareVisuals({ service, userId, diagnostic });
      pdfBuffer = await buildIrcPdf({
        name: displayName,
        report: diagnostic.report,
        answers: diagnostic.answers,
        generatedAt: diagnostic.report_generated_at,
        visuals
      });
      pdfPath = `${userId}/${diagnostic.id}.pdf`;
      const { error: uploadError } = await service.storage
        .from('irc-reports')
        .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      const { error: readyError } = await service
        .from('irc_diagnostics')
        .update({
          pdf_path: pdfPath,
          pdf_status: 'ready',
          pdf_generated_at: new Date().toISOString(),
          delivery_attempts: 0,
          delivery_next_attempt_at: null,
          last_error: null
        })
        .eq('id', diagnostic.id);
      if (readyError) throw readyError;
      pdfReady = true;
      generatedPdfThisRun = true;
      attempts = 0;
    }

    const emailAlreadySent = Boolean(diagnostic.email_sent_at || diagnostic.email_status === 'sent');
    if (emailAlreadySent) {
      return { ok: true, pdf_ready: true, email_status: 'sent' };
    }
    if (!recipient) {
      await markDeliveryFailure(service, diagnostic.id, { email_status: 'failed', last_error: 'report_email_missing_recipient' }, attempts);
      return { ok: false, status: 422, pdf_ready: true, email_status: 'failed', error: 'report_email_missing_recipient' };
    }
    if (diagnostic.email_status === 'sending') return { ok: true, processing: true, pdf_ready: true };

    if (!pdfBuffer) {
      const { data: stored, error: downloadError } = await service.storage.from('irc-reports').download(pdfPath);
      if (downloadError) throw downloadError;
      pdfBuffer = Buffer.from(await stored.arrayBuffer());
    }

    const emailAttempt = generatedPdfThisRun ? 1 : attempts + 1;
    const now = new Date().toISOString();
    const { data: emailClaim, error: emailClaimError } = await service
      .from('irc_diagnostics')
      .update({
        email_status: 'sending',
        delivery_started_at: now,
        delivery_last_attempt_at: now,
        delivery_attempts: emailAttempt,
        delivery_next_attempt_at: null,
        last_error: null
      })
      .eq('id', diagnostic.id)
      .eq('email_status', diagnostic.email_status)
      .select('id')
      .maybeSingle();
    if (emailClaimError) throw emailClaimError;
    if (!emailClaim) return { ok: true, processing: true, pdf_ready: true };
    attempts = emailAttempt;

    const template = ircReportReadyEmail({ name: displayName });
    const result = await sendEmail({
      userId,
      to: recipient,
      subject: template.subject,
      html: template.html,
      emailType: 'irc_report_ready',
      emailSnapshot: { kind: 'irc_report_ready', diagnostic_id: diagnostic.id },
      attachments: [{ filename: 'diagnostico-completo.pdf', content: pdfBuffer }],
      idempotencyKey: `irc-report-${diagnostic.id}`
    });
    if (!result.success) {
      await markDeliveryFailure(service, diagnostic.id, { email_status: 'failed', last_error: 'report_email_failed' }, attempts);
      return { ok: false, status: 502, pdf_ready: true, email_status: 'failed', error: 'report_email_failed' };
    }

    await service
      .from('irc_diagnostics')
      .update({
        email_status: 'sent',
        email_sent_at: new Date().toISOString(),
        delivery_attempts: 0,
        delivery_next_attempt_at: null,
        last_error: null
      })
      .eq('id', diagnostic.id);
    return { ok: true, pdf_ready: true, email_status: 'sent' };
  } catch (error) {
    const safeError = safeIrcDeliveryError(error);
    console.error('[irc/delivery] failed:', safeError, error?.message || error);
    await markDeliveryFailure(
      service,
      diagnostic.id,
      {
        ...(pdfReady ? {} : { pdf_status: 'failed' }),
        last_error: safeError
      },
      attempts
    );
    return { ok: false, status: 500, error: safeError, pdf_ready: pdfReady };
  }
}

export async function recoverStaleIrcDeliveries(service, now = new Date()) {
  const cutoff = new Date(now.getTime() - IRC_DELIVERY_STALE_MINUTES * 60_000).toISOString();
  const nextAttempt = now.toISOString();
  const results = await Promise.all([
    service
      .from('irc_diagnostics')
      .update({ pdf_status: 'failed', delivery_next_attempt_at: nextAttempt, last_error: 'pdf_generation_stale' })
      .eq('status', 'report_ready')
      .eq('pdf_status', 'generating')
      .lt('delivery_started_at', cutoff),
    service
      .from('irc_diagnostics')
      .update({ email_status: 'failed', delivery_next_attempt_at: nextAttempt, last_error: 'email_delivery_stale' })
      .eq('status', 'report_ready')
      .eq('email_status', 'sending')
      .lt('delivery_started_at', cutoff)
  ]);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
}

export async function processNextIrcDelivery(service, { now = new Date() } = {}) {
  await recoverStaleIrcDeliveries(service, now);
  const isoNow = now.toISOString();
  const { data: candidates, error } = await service
    .from('irc_diagnostics')
    .select('*')
    .eq('status', 'report_ready')
    .lt('delivery_attempts', IRC_DELIVERY_MAX_ATTEMPTS)
    .or('pdf_status.in.(pending,failed),email_status.in.(pending,failed)')
    .or(`delivery_next_attempt_at.is.null,delivery_next_attempt_at.lte.${isoNow}`)
    .order('report_generated_at', { ascending: true })
    .limit(5);
  if (error) throw error;

  for (const diagnostic of candidates || []) {
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id,email,full_name,status')
      .eq('id', diagnostic.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    const result = await deliverIrcDiagnostic({ service, diagnostic, profile });
    if (!result.processing) return { processed: true, diagnostic_id: diagnostic.id, ...result };
  }
  return { processed: false };
}
