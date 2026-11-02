import { ASSET_CLASSES, STALE_MANUAL_DAYS } from './investments.constants';
import { DEBT_TYPES, EXPENSIVE_RATE_MONTHLY } from '../../patrimony/domain/patrimony.constants';

const addDays = (dateStr, days) => { const date = new Date(`${dateStr}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const monthLabel = (date) => new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)).replace('.', '');

export function buildAlerts({ policyResults = [], positions = [], goals = [], debts = [], today }) {
  const alerts = policyResults.filter((item) => item.status === 'fora').map((item) => ({ type: 'policy', severity: 'red', title: 'Fora da sua política', text: item.detail, href: '/financas/investimentos/politica' }));
  const reserveId = goals.find((goal) => goal.kind === 'reserva_liquidez')?.id;
  const outsideReserve = positions.filter((item) => item.status !== 'encerrada' && item.goal_id !== reserveId).reduce((sum, item) => sum + Number(item.current_value || 0), 0);
  for (const debt of debts.filter((item) => item.status === 'ativa' && Number(item.interest_rate_monthly) > EXPENSIVE_RATE_MONTHLY && outsideReserve > 0)) {
    const invested = positions.reduce((sum, item) => sum + Number(item.invested_amount || 0), 0); const current = positions.reduce((sum, item) => sum + Number(item.current_value || 0), 0);
    const approximate = invested > 0 ? Math.max(0, (current / invested - 1) * 100) : 0;
    alerts.push({ type: 'expensive_debt', severity: 'red', title: 'Dívida cara e dinheiro investido', text: `Seu ${DEBT_TYPES[debt.debt_type]?.label || debt.debt_type} custa ${Number(debt.interest_rate_monthly).toLocaleString('pt-BR')}% a.m. Seus investimentos rendem cerca de ${approximate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% no período. Leve para a próxima sessão.`, href: '/financas/patrimonio/dividas' });
    break;
  }
  for (const position of positions) {
    const goal = goals.find((item) => item.id === position.goal_id);
    const limitingDate = position.maturity_date || position.redeemable_from;
    if (goal?.kind === 'objetivo_prazo' && limitingDate && limitingDate > goal.target_date) alerts.push({ type: 'goal_maturity', severity: 'gold', title: 'Prazo desalinhado', text: `O ${position.name} vence em ${monthLabel(limitingDate)}, depois de ${monthLabel(goal.target_date)}. Pode faltar liquidez na data.`, href: `/financas/investimentos/${position.id}` });
    if (limitingDate && limitingDate >= today && limitingDate <= addDays(today, 30)) alerts.push({ type: 'upcoming', severity: 'gold', title: 'Data próxima', text: `${position.name}: ${limitingDate}.`, href: `/financas/investimentos/${position.id}` });
    if (position.pricing_method === 'manual' && position.manual_value_at && position.manual_value_at.slice(0, 10) < addDays(today, -STALE_MANUAL_DAYS)) alerts.push({ type: 'stale_manual', severity: 'gold', title: 'Valor manual desatualizado', text: `Confira o valor de ${position.name}.`, href: `/financas/investimentos/${position.id}` });
  }
  const order = { policy: 0, expensive_debt: 1, goal_maturity: 2, upcoming: 3, stale_manual: 4 };
  return alerts.sort((a, b) => order[a.type] - order[b.type]);
}
