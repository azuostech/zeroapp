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
import { listGoals, listPositions } from '@/src/modules/investments/application/investments-service';
import { reserveChecklist } from '@/src/modules/investments/domain/investments.goals';

export async function GET(request) {
  const requestedUserId = request.nextUrl.searchParams.get('user_id');
  const resolved = await routeContext({ request, requestedUserId, resource: 'patrimony_overview' });
  if (resolved.response) return resolved.response;
  const { supabase, context } = resolved;

  try {
    const [assets, debts, settings, settingsSuggestion, milestonesResult, positions, goals] = await Promise.all([
      listAssets({ supabase, userId: context.targetUserId }),
      listDebts({ supabase, userId: context.targetUserId }),
      getSettings({ supabase, userId: context.targetUserId }),
      suggestSettingsFromFinance({ supabase, userId: context.targetUserId }),
      supabase
        .from('patrimony_milestones')
        .select('id,sequence,kind,label,milestone_date,metrics,snapshot,mentor_note')
        .eq('user_id', context.targetUserId)
        .order('sequence', { ascending: true }),
      listPositions({ supabase, userId: context.targetUserId }),
      listGoals({ supabase, userId: context.targetUserId })
    ]);
    if (milestonesResult.error) throw milestonesResult.error;

    const milestones = milestonesResult.data || [];
    const baseline = milestones.find((item) => item.sequence === 0) || null;
    const latest = milestones.at(-1) || null;
    const metrics = computeMetrics({ assets, debts, settings, positions, goals });
    const assetData = enrichAssets({
      assets,
      debts,
      settings,
      baselineSnapshot: baseline?.snapshot || null,
      positions,
      goals
    });
    const commitmentsResult = await supabase
      .from('patrimony_commitments')
      .select('*')
      .eq('user_id', context.targetUserId)
      .is('closed_in_milestone_id', null)
      .not('status', 'in', '(cumprido,nao_cumprido)')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (commitmentsResult.error) throw commitmentsResult.error;
    const openCommitments = commitmentsResult.data || [];

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
        positions,
        goals,
        reserveChecklist: reserveChecklist({ positions: positions.filter((item) => goals.find((goal) => goal.id === item.goal_id)?.kind === 'reserva_liquidez'), dailyBank: settings.daily_bank }),
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
