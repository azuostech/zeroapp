import { routeContext, json, errorResponse } from '@/src/modules/patrimony/application/patrimony-api';
import { listAssets, listDebts, getSettings } from '@/src/modules/patrimony/application/patrimony-service';
import { compareMetrics, daysBetween, pickShareHighlight, verdict } from '@/src/modules/patrimony/domain/patrimony.compare';
import { computeMetrics, netWorthZeroProgress } from '@/src/modules/patrimony/domain/patrimony.calculations';

export async function loadComparison({ supabase, userId, from = 'baseline', to = 'current' }) {
  const { data: milestones, error } = await supabase.from('patrimony_milestones').select('*').eq('user_id', userId).order('sequence'); if (error) throw error;
  const byReference = async (reference) => {
    if (reference === 'current') { const [assets, debts, settings] = await Promise.all([listAssets({ supabase, userId }), listDebts({ supabase, userId }), getSettings({ supabase, userId })]); return { label: 'Hoje', date: new Date().toISOString().slice(0, 10), metrics: computeMetrics({ assets, debts, settings }), snapshot: { assets, debts, settings } }; }
    const item = reference === 'baseline' ? milestones?.find((entry) => entry.sequence === 0) : milestones?.find((entry) => entry.id === reference); return item ? { label: item.label, date: item.milestone_date, metrics: item.metrics, snapshot: item.snapshot, mentorNote: item.mentor_note } : null;
  };
  const fromPoint = await byReference(from); const toPoint = await byReference(to); if (!fromPoint || !toPoint) { const err = new Error('not_found'); err.status = 404; throw err; }
  const comparison = compareMetrics(fromPoint.metrics, toPoint.metrics); const progress = netWorthZeroProgress(toPoint.metrics.net_worth, fromPoint.metrics.net_worth);
  return { from: fromPoint, to: toPoint, days: daysBetween(fromPoint.date, toPoint.date), ...comparison, verdict: verdict(comparison), highlight: pickShareHighlight(comparison.indicators), netWorthZeroProgress: progress, mentorNote: toPoint.mentorNote || null };
}
export async function GET(request) { const query = request.nextUrl.searchParams; const resolved = await routeContext({ request, requestedUserId: query.get('user_id'), resource: 'patrimony_compare' }); if (resolved.response) return resolved.response; try { return json({ data: await loadComparison({ supabase: resolved.supabase, userId: resolved.context.targetUserId, from: query.get('from') || 'baseline', to: query.get('to') || 'current' }) }); } catch (error) { return errorResponse(error); } }
