import { debtInputSchema } from '@/src/modules/patrimony/domain/patrimony.validation';
import { createDebt, getSettings, listDebts, suggestSettingsFromFinance } from '@/src/modules/patrimony/application/patrimony-service';
import { awardDebtMapped } from '@/src/modules/patrimony/application/patrimony-coins';
import { enrichDebts } from '@/src/modules/patrimony/application/patrimony-enrichment';
import { routeContext, json, errorResponse, parseBody } from '@/src/modules/patrimony/application/patrimony-api';

export async function GET(request) {
  const resolved = await routeContext({
    request,
    requestedUserId: request.nextUrl.searchParams.get('user_id'),
    resource: 'patrimony_debt'
  });
  if (resolved.response) return resolved.response;

  try {
    const { supabase, context } = resolved;
    const [debts, settings, settingsSuggestion, baselineResult] = await Promise.all([
      listDebts({ supabase, userId: context.targetUserId }),
      getSettings({ supabase, userId: context.targetUserId }),
      suggestSettingsFromFinance({ supabase, userId: context.targetUserId }),
      supabase
        .from('patrimony_milestones')
        .select('id,label,milestone_date,metrics,snapshot')
        .eq('user_id', context.targetUserId)
        .eq('sequence', 0)
        .maybeSingle()
    ]);
    if (baselineResult.error) throw baselineResult.error;

    const enriched = enrichDebts({
      debts,
      settings,
      baselineSnapshot: baselineResult.data?.snapshot || null
    });
    const baselineMetrics = baselineResult.data?.metrics || null;
    return json({
      data: {
        ...enriched,
        settings,
        settingsSuggestion,
        baseline: baselineResult.data || null,
        deltasVsBaseline: baselineMetrics ? {
          total_debts: enriched.totals.total_debts - Number(baselineMetrics.total_debts || 0),
          monthly_interest: enriched.totals.monthly_interest - Number(baselineMetrics.monthly_interest || 0),
          monthly_debt_outflow: enriched.totals.monthly_debt_outflow - Number(baselineMetrics.monthly_debt_outflow || 0)
        } : null
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const body = await parseBody(request);
  if (!body) return json({ error: 'invalid_json_body' }, 400);
  const parsed = debtInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
  const resolved = await routeContext({
    request,
    requestedUserId: body.user_id,
    resource: 'patrimony_debt',
    action: 'create'
  });
  if (resolved.response) return resolved.response;

  try {
    const { supabase, context } = resolved;
    const debt = await createDebt({
      supabase,
      userId: context.targetUserId,
      input: parsed.data,
      actorId: context.user.id,
      actorRole: context.actorRole
    });
    let coins = { awarded: false };
    try {
      coins = await awardDebtMapped({ debtId: debt.id, userId: context.targetUserId });
    } catch (error) {
      coins = { awarded: false, warning: error.message };
    }
    return json({ data: debt, coins }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
