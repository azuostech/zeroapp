import { ASSET_CATEGORIES, EXPENSIVE_RATE_MONTHLY } from './patrimony.constants';
import { roundCents } from './patrimony.money';

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
export const annualToMonthlyRate = (annualPct) => Math.round(((Math.pow(1 + number(annualPct) / 100, 1 / 12) - 1) * 100) * 10000) / 10000;
export const monthlyToAnnualRate = (monthlyPct) => Math.round(((Math.pow(1 + number(monthlyPct) / 100, 12) - 1) * 100) * 10000) / 10000;

export function debtMonthlyInterest(debt) {
  if (!debt || debt.status === 'quitada' || debt.interest_rate_monthly == null) return 0;
  return roundCents(number(debt.current_balance) * number(debt.interest_rate_monthly) / 100);
}

export function impliedMonthlyRate({ balance, installment, remainingInstallments }) {
  const principal = number(balance); const payment = number(installment); const periods = number(remainingInstallments);
  if (principal <= 0 || payment <= 0 || periods <= 0 || payment * periods <= principal * 0.999) return null;
  let low = 0; let high = 0.3;
  for (let i = 0; i < 100; i += 1) {
    const rate = (low + high) / 2;
    const presentValue = rate === 0 ? payment * periods : payment * (1 - Math.pow(1 + rate, -periods)) / rate;
    if (presentValue > principal) low = rate; else high = rate;
  }
  return Math.round(((low + high) / 2 * 100) * 10000) / 10000;
}

export function payoffSimulation({ balance, monthlyRatePct, monthlyPayment }) {
  const principal = number(balance); const payment = number(monthlyPayment); const rate = number(monthlyRatePct) / 100;
  if (principal <= 0) return { months: 0, monthsExact: 0, totalInterest: 0, neverPays: false };
  if (payment <= 0 || payment <= rate * principal) return { neverPays: true, months: null, totalInterest: null };
  const monthsExact = rate === 0 ? principal / payment : -Math.log(1 - rate * principal / payment) / Math.log(1 + rate);
  return { months: Math.ceil(monthsExact), monthsExact, totalInterest: roundCents(monthsExact * payment - principal), neverPays: false };
}

export const debtMonthlyOutflow = (debt) => roundCents(number(debt?.monthly_payment ?? debt?.installment_amount));
export function debtProgress(debt, baselineDebt) {
  if (debt?.is_installment && number(debt.installments_total) > 0) {
    const paid = number(debt.installments_paid); const total = number(debt.installments_total);
    return { pct: Math.round(Math.min(100, paid / total * 100)), label: `${paid} de ${total} parcelas pagas` };
  }
  const baseline = number(baselineDebt?.current_balance);
  if (baseline <= 0) return { pct: null, label: null };
  const pct = Math.round(Math.max(0, Math.min(1, 1 - number(debt.current_balance) / baseline)) * 100);
  return { pct, label: `${pct}% abatido desde o Estado A` };
}

export function prioritizeDebts(debts = []) {
  return debts.filter((debt) => debt.status === 'ativa').sort((a, b) => {
    const ar = a.interest_rate_monthly == null ? -1 : number(a.interest_rate_monthly);
    const br = b.interest_rate_monthly == null ? -1 : number(b.interest_rate_monthly);
    return br - ar || number(a.current_balance) - number(b.current_balance);
  }).map((debt, index) => ({ ...debt, priority: index + 1, isExpensive: number(debt.interest_rate_monthly) > EXPENSIVE_RATE_MONTHLY }));
}

export function cheaperReferenceRate(debts = [], currentDebt) {
  const eligible = new Set(['emprestimo', 'consignado', 'financiamento']);
  const rates = debts.filter((debt) => debt.id !== currentDebt?.id && debt.status === 'ativa' && eligible.has(debt.debt_type) && number(debt.interest_rate_monthly) > 0).map((debt) => number(debt.interest_rate_monthly));
  // Use the closest cheaper credit reference; this avoids presenting secured
  // financing rates as if they were directly available for revolving debt.
  return rates.length ? Math.max(...rates) : null;
}

export function computeMetrics({ assets = [], debts = [], settings = {}, positions = [], goals = [] }) {
  const activePositions = positions.filter((item) => !item.archived_at && item.status !== 'encerrada');
  const migratedAssetIds = new Set(activePositions.map((item) => item.migrated_from_asset_id).filter(Boolean));
  const activeAssets = assets.filter((item) => !item.archived_at && !migratedAssetIds.has(item.id));
  const activeDebts = debts.filter((item) => !item.archived_at && item.status === 'ativa');
  const sumAssets = (filter) => roundCents(activeAssets.filter(filter).reduce((sum, item) => sum + number(item.current_value), 0));
  const sumPositions = (filter) => roundCents(activePositions.filter(filter).reduce((sum, item) => sum + number(item.current_value), 0));
  const reserveGoalIds = new Set(goals.filter((item) => !item.archived_at && item.kind === 'reserva_liquidez').map((item) => item.id));
  const positionTotal = sumPositions(() => true);
  const totalAssets = roundCents(sumAssets(() => true) + positionTotal); const totalDebts = roundCents(activeDebts.reduce((sum, item) => sum + number(item.current_balance), 0));
  const reserveTotal = roundCents(sumAssets((item) => item.category === 'reserva') + sumPositions((item) => reserveGoalIds.has(item.goal_id)));
  const investmentsPositionsTotal = roundCents(positionTotal - sumPositions((item) => reserveGoalIds.has(item.goal_id)));
  const variableIncome = new Set(['acao', 'fii', 'etf', 'bdr', 'cripto']);
  const monthlyIncome = settings.monthly_income == null ? null : number(settings.monthly_income);
  const livingCost = settings.monthly_cost_of_living == null ? null : number(settings.monthly_cost_of_living);
  const monthlyOutflow = roundCents(activeDebts.reduce((sum, item) => sum + debtMonthlyOutflow(item), 0));
  const expensive = activeDebts.filter((item) => number(item.interest_rate_monthly) > EXPENSIVE_RATE_MONTHLY);
  return {
    total_assets: totalAssets,
    productive_assets: roundCents(sumAssets((item) => ASSET_CATEGORIES[item.category]?.productive) + positionTotal),
    reserve_total: reserveTotal,
    investments_total: roundCents(sumAssets((item) => item.category === 'investimento') + investmentsPositionsTotal),
    investments_positions_total: positionTotal,
    variable_income_total: sumPositions((item) => variableIncome.has(item.asset_class)),
    goods_total: sumAssets((item) => item.category === 'bem'),
    total_debts: totalDebts, net_worth: roundCents(totalAssets - totalDebts),
    monthly_interest: roundCents(activeDebts.reduce((sum, item) => sum + debtMonthlyInterest(item), 0)),
    monthly_debt_outflow: monthlyOutflow,
    debt_income_ratio: monthlyIncome > 0 ? roundCents(monthlyOutflow / monthlyIncome * 100) : null,
    expensive_debt_total: roundCents(expensive.reduce((sum, item) => sum + number(item.current_balance), 0)),
    expensive_debt_count: expensive.length,
    expensive_debt_interest: roundCents(expensive.reduce((sum, item) => sum + debtMonthlyInterest(item), 0)),
    overdue_count: activeDebts.filter((item) => number(item.days_overdue) > 0).length,
    active_debt_count: activeDebts.length,
    reserve_months: livingCost > 0 ? roundCents(reserveTotal / livingCost) : null,
    reserve_target_months: number(settings.reserve_target_months || 6), monthly_income: monthlyIncome, monthly_cost_of_living: livingCost
  };
}

export function netWorthZeroProgress(currentNetWorth, baselineNetWorth) {
  const baseline = number(baselineNetWorth); if (baseline >= 0) return null;
  return Math.round(Math.max(0, Math.min(100, (number(currentNetWorth) - baseline) / -baseline * 100)));
}
export const progressTone = (pct) => number(pct) >= 75 ? 'green' : number(pct) >= 50 ? 'gold' : 'orange';
