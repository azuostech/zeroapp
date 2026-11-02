import { ALERTS_ON_HUB } from '../domain/investments.constants';
import { buildAlerts } from '../domain/investments.alerts';
import { buildCalendar } from '../domain/investments.events';
import { goalTotals, reserveChecklist, reserveStatus } from '../domain/investments.goals';
import { contributionStreak, monthContributions, plannedFromFinance } from '../domain/investments.planned';
import { evaluatePolicy, positionsOutOfPolicy, summarizePolicy } from '../domain/investments.policy';
import { indexPeriodPct, monthReturn, pctOfIndex } from '../domain/investments.valuation';
import { getCurrentPolicy } from './investments-policy-service';
import { listGoals, listPositions } from './investments-service';

export async function buildOverview({ supabase, userId, today }) {
  const month = today.slice(0, 7); const monthDate = `${month}-01`; const [goals, positions, policy, settings, debts, movements, monthly, finance, cdi] = await Promise.all([
    listGoals({ supabase, userId }), listPositions({ supabase, userId }), getCurrentPolicy({ supabase, userId }),
    supabase.from('patrimony_settings').select('*').eq('user_id', userId).maybeSingle(), supabase.from('patrimony_debts').select('*').eq('user_id', userId).is('archived_at', null),
    supabase.from('investment_movements').select('*').eq('user_id', userId), supabase.from('investment_monthly_values').select('*').eq('user_id', userId).eq('month', monthDate),
    supabase.from('financial_data').select('data').eq('user_id', userId).eq('month', month.slice(5, 7)).eq('year', month.slice(0, 4)).maybeSingle(),
    supabase.from('market_index_series').select('*').eq('series', 'cdi').gte('ref_date', monthDate).lte('ref_date', today)
  ]);
  for (const result of [settings, debts, movements, monthly, finance, cdi]) if (result.error) throw new Error(result.error.message);
  const total = positions.reduce((sum, item) => sum + Number(item.current_value || 0), 0); const reserveGoal = goals.find((item) => item.kind === 'reserva_liquidez'); const reservePositions = positions.filter((item) => item.goal_id === reserveGoal?.id); const reserveTotal = reservePositions.reduce((sum, item) => sum + Number(item.current_value || 0), 0);
  const planned = plannedFromFinance(finance.data?.data || {}); const reserve = { ...reserveStatus({ reserveTotal, costOfLiving: settings.data?.monthly_cost_of_living, targetMonths: settings.data?.reserve_target_months || 6, plannedMonthly: planned.reserve }), checklist: reserveChecklist({ positions: reservePositions, dailyBank: settings.data?.daily_bank, today }) };
  const policyResults = evaluatePolicy({ rules: policy?.rules || [], positions, goals, costOfLiving: settings.data?.monthly_cost_of_living }); const alerts = buildAlerts({ policyResults, positions, goals, debts: debts.data || [], today });
  const currentMovements = movements.data || []; const done = monthContributions(currentMovements, month); const streak = contributionStreak(currentMovements.filter((item) => item.kind === 'aporte').map((item) => item.occurred_on), today);
  let monthResult = null; const snapshots = monthly.data || [];
  if (snapshots.length) { const startValue = snapshots.reduce((sum, item) => sum + Number(item.value || 0), 0); const netFlows = currentMovements.filter((item) => item.occurred_on >= monthDate).reduce((sum, item) => sum + (['resgate', 'vencimento'].includes(item.kind) ? -Number(item.amount) : item.kind === 'aporte' || item.kind === 'ajuste' ? Number(item.amount) : 0), 0); const calculated = monthReturn({ startValue, endValue: total, netFlows }); const cdiPct = indexPeriodPct({ series: cdi.data || [], from: monthDate, to: today }); monthResult = { ...calculated, cdiPct, pctOfCdi: pctOfIndex(calculated.pct, cdiPct) }; }
  const calendar = buildCalendar({ positions, goals, today });
  return { total, month: monthResult, goals: goalTotals({ goals, positions }), reserve, contributions: { planned, done, streak }, alerts: { all: alerts, top3: alerts.slice(0, ALERTS_ON_HUB) }, policySummary: summarizePolicy(policyResults), calendarThisMonth: calendar.thisMonthCount, positionsOutOfPolicy: [...positionsOutOfPolicy(policyResults, positions)] };
}
