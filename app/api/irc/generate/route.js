import { NextResponse } from 'next/server';
import { canonicalizeAnswers } from '@/src/modules/irc/domain/irc-domains';
import { findOrCreateDiagnostic, getIrcRequestContext, serializeDiagnostic } from '@/src/modules/irc/application/irc-access';
import { generateIrcReport } from '@/src/modules/irc/application/irc-report';

export const runtime = 'nodejs';
export const maxDuration = 60;

function safeGenerationError(error) {
  const message = String(error?.message || '');
  if (message === 'anthropic_not_configured') return 'report_service_not_configured';
  if (message === 'invalid_report_structure') return 'invalid_report_structure';
  if (message.toLowerCase().includes('abort')) return 'report_generation_timeout';
  return 'report_generation_failed';
}

export async function POST() {
  let context;
  let diagnostic;

  try {
    context = await getIrcRequestContext();
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    diagnostic = await findOrCreateDiagnostic(context);
    if (diagnostic.report && diagnostic.status === 'report_ready') {
      return NextResponse.json({ diagnostic: serializeDiagnostic(diagnostic), reused: true });
    }
    if (diagnostic.status === 'generating_report') {
      return NextResponse.json({ diagnostic: serializeDiagnostic(diagnostic), processing: true }, { status: 202 });
    }
    if (!['answers_completed', 'generation_failed'].includes(diagnostic.status)) {
      return NextResponse.json({ error: 'diagnostic_not_complete' }, { status: 409 });
    }

    const canonicalAnswers = canonicalizeAnswers(diagnostic.answers);
    if (!canonicalAnswers) {
      return NextResponse.json({ error: 'invalid_stored_answers' }, { status: 422 });
    }

    const { data: claimed, error: claimError } = await context.service
      .from('irc_diagnostics')
      .update({
        status: 'generating_report',
        generation_attempts: Number(diagnostic.generation_attempts || 0) + 1,
        last_error: null
      })
      .eq('id', diagnostic.id)
      .eq('user_id', context.user.id)
      .in('status', ['answers_completed', 'generation_failed'])
      .select('*')
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json({ processing: true }, { status: 202 });
    }

    diagnostic = claimed;
    const generated = await generateIrcReport({
      name: String(context.profile.full_name || context.profile.email || 'Você').trim().split(/\s+/)[0],
      answers: canonicalAnswers
    });

    const { data: ready, error: saveError } = await context.service
      .from('irc_diagnostics')
      .update({
        status: 'report_ready',
        report: generated.report,
        report_model: generated.model,
        report_version: generated.version,
        report_generated_at: new Date().toISOString(),
        report_input_tokens: generated.inputTokens,
        report_output_tokens: generated.outputTokens,
        pdf_status: 'pending',
        email_status: 'pending',
        last_error: null
      })
      .eq('id', diagnostic.id)
      .eq('status', 'generating_report')
      .select('*')
      .single();

    if (saveError) throw saveError;
    return NextResponse.json({ diagnostic: serializeDiagnostic(ready) });
  } catch (error) {
    const safeError = safeGenerationError(error);
    console.error('[irc/generate] failed:', safeError, error?.status || '');

    if (context?.service && diagnostic?.id) {
      await context.service
        .from('irc_diagnostics')
        .update({ status: 'generation_failed', last_error: safeError })
        .eq('id', diagnostic.id)
        .eq('status', 'generating_report');
    }

    return NextResponse.json({ error: safeError }, { status: safeError === 'report_service_not_configured' ? 503 : 502 });
  }
}
