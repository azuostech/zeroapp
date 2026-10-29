import { routeContext, json, errorResponse } from '@/src/modules/patrimony/application/patrimony-api';
import {
  getSettings,
  listAssets,
  listDebts,
  suggestSettingsFromFinance
} from '@/src/modules/patrimony/application/patrimony-service';
import { computeMetrics, netWorthZeroProgress, prioritizeDebts } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { enrichAssets } from '@/src/modules/patrimony/application/patrimony-enrichment';
import { roundCents } from '@/src/modules/patrimony/domain/patrimony.money';

export async function GET(request) {
  const requestedUserId = request.nextUrl.searchParams.get('user_id');
  const resolved = await routeContext({ request, requestedUserId, resource: 'patrimony_overview' });
  if (resolved.response) return resolved.response;
  const { supabase, context } = resolved;

  try {
    const [assets, debts, settings, settingsSuggestion, milestonesResult] = await Promise.all([
      listAssets({ supabase, userId: context.targetUserId }),
      listDebts({ supabase, userId: context.targetUserId }),
      getSettings({ supabase, userId: context.targetUserId }),
      suggestSettingsFromFinance({ supabase, userId: context.targetUserId }),
      supabase
        .from('patrimony_milestones')
        .select('id,sequence,kind,label,milestone_date,metrics,snapshot,mentor_note')
        .eq('user_id', context.targetUserId)
        .order('sequence', { ascending: true })
    ]);
    if (milestonesResult.error) throw milestonesResult.error;

    const milestones = milestonesResult.data || [];
    const baseline = milestones.find((item) => item.sequence === 0) || null;
    const latest = milestones.at(-1) || null;
    const metrics = computeMetrics({ assets, debts, settings });
    const assetData = enrichAssets({
      assets,
      debts,
      settings,
      baselineSnapshot: baseline?.snapshot || null
    });
    let openCommitments = [];
    if (latest) {
      const commitmentsResult = await supabase
        .from('patrimony_commitments')
        .select('*')
        .eq('user_id', context.targetUserId)
        .eq('milestone_id', latest.id)
        .eq('status', 'aberto')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (commitmentsResult.error) throw commitmentsResult.error;
      openCommitments = commitmentsResult.data || [];
    }

    const deltasVsBaseline = Object.fromEntries(
      ['total_assets', 'total_debts', 'monthly_interest', 'net_worth'].map((key) => [
        key,
        baseline ? roundCents(metrics[key] - Number(baseline.metrics?.[key] || 0)) : null
      ])
    );
    const progress = baseline ? netWorthZeroProgress(metrics.net_worth, baseline.metrics?.net_worth) : null;

    return json({
      data: {
        assets: assetData.assets,
        assetComposition: assetData.composition,
        reserveTargetValue: assetData.reserveTargetValue,
        debts: prioritizeDebts(debts),
        settings,
        settingsSuggestion,
        metrics,
        baseline,
        latest,
        milestones,
        openCommitments,
        nextCommitmentDate: openCommitments.find((item) => item.due_date)?.due_date || null,
        netWorthZeroProgress: progress,
        remainingToZero: metrics.net_worth < 0 ? roundCents(Math.abs(metrics.net_worth)) : 0,
        deltasVsBaseline,
        targetProfile: {
          id: context.targetProfile?.id,
          full_name: context.targetProfile?.full_name || '',
          email: context.targetProfile?.email || ''
        }
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
