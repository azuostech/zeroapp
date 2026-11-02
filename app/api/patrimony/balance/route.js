import { computeBalanceSheet } from '@/src/modules/patrimony/domain/patrimony.balance';
import { computeMetrics } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { getSettings, listAssets, listDebts } from '@/src/modules/patrimony/application/patrimony-service';
import { errorResponse, json, routeContext } from '@/src/modules/patrimony/application/patrimony-api';

export async function GET(request) {
  const resolved = await routeContext({ request, requestedUserId: request.nextUrl.searchParams.get('user_id'), resource: 'patrimony_balance' });
  if (resolved.response) return resolved.response;
  try {
    const { supabase, context } = resolved; const userId = context.targetUserId;
    const [assets, debts, settings, milestones, monthly] = await Promise.all([
      listAssets({ supabase, userId }), listDebts({ supabase, userId }), getSettings({ supabase, userId }),
      supabase.from('patrimony_milestones').select('id,label,milestone_date,metrics').eq('user_id', userId).order('milestone_date'),
      supabase.from('patrimony_monthly_snapshots').select('month,metrics').eq('user_id', userId).order('month')
    ]);
    if (milestones.error) throw milestones.error; if (monthly.error) throw monthly.error;
    const today = new Date().toISOString().slice(0, 10); const metrics = computeMetrics({ assets, debts, settings });
    const balance = computeBalanceSheet({ assets, debts, positions: [], settings, today });
    const series = [
      ...(milestones.data || []).map((item) => ({ date: item.milestone_date, net_worth: Number(item.metrics?.net_worth || 0), kind: 'marco', label: item.label })),
      ...(monthly.data || []).map((item) => ({ date: item.month, net_worth: Number(item.metrics?.net_worth || 0), kind: 'mensal' })),
      { date: today, net_worth: metrics.net_worth, kind: 'hoje', label: 'Hoje' }
    ].sort((a, b) => a.date.localeCompare(b.date));
    const staleGoods = assets.filter((item) => item.category === 'bem' && (Date.now() - new Date(item.updated_at).getTime()) / 86400000 > 60);
    return json({ data: { ...balance, series, staleGoods, assets, debts, settings } });
  } catch (error) { return errorResponse(error); }
}
