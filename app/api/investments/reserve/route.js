import { listGoals, listPositions } from '@/src/modules/investments/application/investments-service';
import { reserveChecklist, reserveStatus } from '@/src/modules/investments/domain/investments.goals';
import { plannedFromFinance } from '@/src/modules/investments/domain/investments.planned';
import { investmentsContext, errorResponse, json } from '@/src/modules/investments/application/investments-api';

export async function GET(request) {
  const resolved = await investmentsContext({ request, requestedUserId: request.nextUrl.searchParams.get('user_id'), resource: 'investment_reserve' });
  if (resolved.response) return resolved.response;
  try {
    const today = new Date().toISOString().slice(0, 10); const month = today.slice(5, 7); const year = today.slice(0, 4);
    const [goals, all, settings, finance] = await Promise.all([
      listGoals({ supabase: resolved.supabase, userId: resolved.context.targetUserId }),
      listPositions({ supabase: resolved.supabase, userId: resolved.context.targetUserId }),
      resolved.supabase.from('patrimony_settings').select('*').eq('user_id', resolved.context.targetUserId).maybeSingle(),
      resolved.supabase.from('financial_data').select('data').eq('user_id', resolved.context.targetUserId).eq('month', month).eq('year', year).maybeSingle()
    ]);
    if (settings.error) throw settings.error; if (finance.error) throw finance.error;
    const goal = goals.find((item) => item.kind === 'reserva_liquidez'); const positions = all.filter((item) => item.goal_id === goal?.id); const total = positions.reduce((sum, item) => sum + Number(item.current_value || 0), 0); const planned = plannedFromFinance(finance.data?.data || {});
    return json({ data: { goal, positions, total, settings: settings.data || {}, plannedMonthly: planned.total, ...reserveStatus({ reserveTotal: total, costOfLiving: settings.data?.monthly_cost_of_living, targetMonths: settings.data?.reserve_target_months || 6, plannedMonthly: planned.total }), checklist: reserveChecklist({ positions, dailyBank: settings.data?.daily_bank, today }) } });
  } catch (error) { return errorResponse(error); }
}
