import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findOrCreateDiagnostic, getIrcRequestContext, serializeDiagnostic } from '@/src/modules/irc/application/irc-access';
import { IRC_DOMAINS, getBranchOption, getEntryOption } from '@/src/modules/irc/domain/irc-domains';

const schema = z
  .object({
    domain_id: z.string().min(1).max(40),
    stage: z.enum(['entry', 'branch']),
    option_id: z.string().min(1).max(60)
  })
  .strict();

function isAlreadySaved(diagnostic, payload) {
  const stored = diagnostic.answers?.[payload.domain_id];
  if (payload.stage === 'entry') return stored?.entry_id === payload.option_id;
  return stored?.branch_id === payload.option_id;
}

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_answer' }, { status: 400 });
  }

  try {
    const context = await getIrcRequestContext();
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const diagnostic = await findOrCreateDiagnostic(context);
    if (['answers_completed', 'generating_report', 'report_ready', 'generation_failed'].includes(diagnostic.status)) {
      return NextResponse.json({ error: 'answers_locked' }, { status: 409 });
    }

    const { domain_id: domainId, stage, option_id: optionId } = parsed.data;
    const expectedDomain = IRC_DOMAINS[diagnostic.current_domain];
    if (!expectedDomain) {
      return NextResponse.json({ error: 'diagnostic_already_complete' }, { status: 409 });
    }

    if (expectedDomain.id !== domainId || diagnostic.current_stage !== stage) {
      if (isAlreadySaved(diagnostic, parsed.data)) {
        return NextResponse.json({ diagnostic: serializeDiagnostic(diagnostic), idempotent: true });
      }
      return NextResponse.json({ error: 'answer_out_of_sequence' }, { status: 409 });
    }

    const answers = { ...(diagnostic.answers || {}) };
    const now = new Date().toISOString();
    let update;

    if (stage === 'entry') {
      const entry = getEntryOption(expectedDomain, optionId);
      if (!entry) return NextResponse.json({ error: 'invalid_entry_option' }, { status: 422 });

      answers[domainId] = { entry_id: entry.id };
      update = {
        answers,
        status: 'in_progress',
        current_stage: 'branch',
        started_at: diagnostic.started_at || now,
        last_error: null
      };
    } else {
      const entry = getEntryOption(expectedDomain, answers[domainId]?.entry_id);
      const branch = getBranchOption(entry, optionId);
      if (!entry || !branch) return NextResponse.json({ error: 'invalid_branch_option' }, { status: 422 });

      answers[domainId] = { entry_id: entry.id, branch_id: branch.id };
      const isLast = diagnostic.current_domain === IRC_DOMAINS.length - 1;
      update = isLast
        ? {
            answers,
            status: 'answers_completed',
            current_domain: IRC_DOMAINS.length,
            current_stage: 'complete',
            completed_at: now,
            last_error: null
          }
        : {
            answers,
            status: 'in_progress',
            current_domain: diagnostic.current_domain + 1,
            current_stage: 'entry',
            last_error: null
          };
    }

    const { data, error } = await context.service
      .from('irc_diagnostics')
      .update(update)
      .eq('id', diagnostic.id)
      .eq('user_id', context.user.id)
      .eq('updated_at', diagnostic.updated_at)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'answer_conflict' }, { status: 409 });
    }

    return NextResponse.json({ diagnostic: serializeDiagnostic(data) });
  } catch (error) {
    console.error('[irc/answer] save failed:', error?.message || error);
    return NextResponse.json({ error: 'answer_save_failed' }, { status: 500 });
  }
}
