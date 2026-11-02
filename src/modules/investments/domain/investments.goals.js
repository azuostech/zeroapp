import { ASSET_CLASSES, GOAL_COLORS } from './investments.constants';
import { monthsBetween } from './investments.calendar';
import { roundCents } from '../../patrimony/domain/patrimony.money';

const active = (item) => item.status !== 'encerrada' && !item.archived_at;
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export const goalTotal = (goalId, positions) => roundCents(positions.filter((item) => active(item) && item.goal_id === goalId).reduce((sum, item) => sum + Number(item.current_value || 0), 0));

export function goalTotals({ goals = [], positions = [] }) {
  const total = positions.filter(active).reduce((sum, item) => sum + Number(item.current_value || 0), 0);
  const order = { reserva_liquidez: 0, objetivo_prazo: 1, independencia: 2 };
  return goals.filter((goal) => !goal.archived_at).map((goal) => {
    const current = goalTotal(goal.id, positions);
    return { goal, total: current, pct: total > 0 ? Math.round(current / total * 1000) / 10 : 0, color: GOAL_COLORS[goal.kind] };
  }).sort((a, b) => order[a.goal.kind] - order[b.goal.kind] || String(a.goal.target_date || '').localeCompare(String(b.goal.target_date || '')));
}

export function monthsToGoalLabel(months) {
  if (months === 0) return 'meta atingida';
  const years = Math.floor(months / 12); const rest = months % 12;
  if (!years) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'}${rest ? ` e ${rest} ${rest === 1 ? 'mês' : 'meses'}` : ''}`;
}

export function reserveStatus({ reserveTotal = 0, costOfLiving, targetMonths = 6, plannedMonthly = 0 }) {
  const cost = Number(costOfLiving || 0); const months = cost > 0 ? reserveTotal / cost : null;
  const monthsLabel = months == null ? null : (Math.round(months * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const target = cost > 0 ? roundCents(cost * targetMonths) : null;
  const missing = target == null ? null : roundCents(Math.max(0, target - reserveTotal));
  const monthsToGoal = missing == null || Number(plannedMonthly) <= 0 ? null : Math.ceil(missing / Number(plannedMonthly));
  return { months, monthsLabel, label: months == null ? null : `${monthsLabel} de ${targetMonths} meses`, filledBlocks: months == null ? 0 : Math.min(Math.round(months), targetMonths), target, pct: target > 0 ? Math.round(reserveTotal / target * 100) : null, missing, monthsToGoal, monthsToGoalLabel: monthsToGoal == null ? null : monthsToGoalLabel(monthsToGoal) };
}

export function reserveChecklist({ positions = [], dailyBank, today = new Date().toISOString().slice(0, 10) }) {
  const current = positions.filter(active);
  const liquidity = current.every((item) => Number(item.liquidity_days) <= 1 && (!item.redeemable_from || item.redeemable_from <= today));
  const risk = current.every((item) => !ASSET_CLASSES[item.asset_class]?.variableIncome && !(item.risk_flags || []).includes('credito_privado'));
  const guarantee = current.every((item) => ['fgc', 'tesouro'].includes(item.guarantee));
  const separate = dailyBank ? !current.some((item) => normalize(item.institution) === normalize(dailyBank)) : null;
  return [
    { key: 'liquidity', ok: liquidity, text: 'Liquidez diária' },
    { key: 'risk', ok: risk, text: 'Baixo risco' },
    { key: 'guarantee', ok: guarantee, text: 'Proteção FGC ou Tesouro' },
    { key: 'separate', ok: separate, text: dailyBank ? 'Separada da conta do dia a dia' : 'Informe o banco da sua conta do dia a dia' }
  ];
}

export function goalProgress(goal, total, today) {
  const target = Number(goal.target_amount || 0);
  return { pct: target > 0 ? Math.round(Number(total || 0) / target * 100) : null, monthsLeft: goal.target_date ? monthsBetween(today, goal.target_date) : null, missing: target > 0 ? roundCents(Math.max(0, target - Number(total || 0))) : null };
}
