import { routeContext, json, errorResponse } from '@/src/modules/patrimony/application/patrimony-api';
import { getSettings, listAssets, listDebts } from '@/src/modules/patrimony/application/patrimony-service';
import { compareMetrics, daysBetween, pickShareHighlight, verdict } from '@/src/modules/patrimony/domain/patrimony.compare';
import { computeMetrics, netWorthZeroProgress } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { calculateNetWorthProjection, resolveComparisonPoint } from '@/src/modules/patrimony/application/patrimony-enrichment';

async function loadCurrentPoint({ supabase, userId }) {
  const [assets, debts, settings] = await Promise.all([
    listAssets({ supabase, userId }),
    listDebts({ supabase, userId }),
    getSettings({ supabase, userId })
  ]);
  return {
    id: 'current',
    label: 'Hoje (ao vivo)',
    date: new Date().toISOString().slice(0, 10),
    metrics: computeMetrics({ assets, debts, settings }),
    snapshot: { version: 1, captured_at: new Date().toISOString(), assets, debts, settings },
    mentorNote: null
  };
}

export async function loadComparison({ supabase, userId, from = 'baseline', to = 'current' }) {
  const [{ data: milestones, error }, current] = await Promise.all([
    supabase.from('patrimony_milestones').select('*').eq('user_id', userId).order('sequence'),
    loadCurrentPoint({ supabase, userId })
  ]);
  if (error) throw error;
  const allMilestones = milestones || [];
  const fromPoint = resolveComparisonPoint({ reference: from, milestones: allMilestones, current });
  const toPoint = resolveComparisonPoint({ reference: to, milestones: allMilestones, current });
  if (!fromPoint || !toPoint) {
    const missing = new Error('not_found');
    missing.status = 404;
    throw missing;
  }

  const comparison = compareMetrics(fromPoint.metrics, toPoint.metrics);
  const baseline = allMilestones.find((entry) => entry.sequence === 0);
  const timelinePoints = [
    ...allMilestones.map((entry) => ({ date: entry.milestone_date, metrics: entry.metrics })),
    { date: current.date, metrics: current.metrics }
  ];

  return {
    from: fromPoint,
    to: toPoint,
    days: daysBetween(fromPoint.date, toPoint.date),
    ...comparison,
    verdict: verdict(comparison),
    highlight: pickShareHighlight(comparison.indicators),
    netWorthZeroProgress: baseline
      ? netWorthZeroProgress(toPoint.metrics.net_worth, baseline.metrics.net_worth)
      : null,
    mentorNote: toPoint.mentorNote,
    projection: calculateNetWorthProjection(timelinePoints),
    availablePoints: [
      ...allMilestones.map((entry) => ({
        id: entry.id,
        sequence: entry.sequence,
        label: entry.label,
        date: entry.milestone_date
      })),
      { id: 'current', sequence: null, label: 'Hoje (ao vivo)', date: current.date }
    ]
  };
}

export async function GET(request) {
  const query = request.nextUrl.searchParams;
  const resolved = await routeContext({
    request,
    requestedUserId: query.get('user_id'),
    resource: 'patrimony_compare'
  });
  if (resolved.response) return resolved.response;
  try {
    return json({
      data: await loadComparison({
        supabase: resolved.supabase,
        userId: resolved.context.targetUserId,
        from: query.get('from') || 'baseline',
        to: query.get('to') || 'current'
      })
    });
  } catch (error) {
    return errorResponse(error);
  }
}
