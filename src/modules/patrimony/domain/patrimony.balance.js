import { ASSET_CATEGORIES, PASSIVE_INCOME_MONTHLY_RATE } from './patrimony.constants';
import { roundCents } from './patrimony.money';

export { PASSIVE_INCOME_MONTHLY_RATE };
export const AVAILABLE_DAYS = 30;
export const SHORT_TERM_MONTHS = 12;
export const ROTATING_DEBT_TYPES = ['cartao', 'cheque_especial'];

const value = (input) => Number.isFinite(Number(input)) ? Number(input) : 0;
const active = (item) => !item?.archived_at && !['quitada', 'encerrada'].includes(item?.status);
const dateOnly = (input) => input ? String(input).slice(0, 10) : null;
const addDays = (date, days) => {
  const parsed = new Date(`${dateOnly(date)}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

export function isPositionAvailableIn30Days(position, today) {
  if (!active(position)) return false;
  if (position.redeemable_from && dateOnly(position.redeemable_from) > addDays(today, AVAILABLE_DAYS)) return false;
  if (value(position.liquidity_days) <= AVAILABLE_DAYS && position.liquidity_days != null) return true;
  return ['tesouro', 'acao', 'fii', 'etf', 'bdr'].includes(position.asset_class);
}

export function isAssetAvailableIn30Days(asset) {
  return active(asset) && ['diaria', 'curto_prazo'].includes(asset.liquidity);
}

export function debtDueIn12Months(debt) {
  if (!active(debt)) return 0;
  const balance = value(debt.current_balance);
  if (ROTATING_DEBT_TYPES.includes(debt.debt_type) || (['familia', 'outro'].includes(debt.debt_type) && !debt.is_installment)) return roundCents(balance);
  if (debt.is_installment && debt.installment_amount != null) {
    const remaining = Math.max(0, value(debt.installments_total) - value(debt.installments_paid));
    return roundCents(Math.min(balance, Math.min(remaining, SHORT_TERM_MONTHS) * value(debt.installment_amount)));
  }
  if (debt.monthly_payment != null) return roundCents(Math.min(balance, SHORT_TERM_MONTHS * value(debt.monthly_payment)));
  return roundCents(balance);
}

export function computeBalanceSheet({ assets = [], positions = [], debts = [], settings = {}, today }) {
  const currentAssets = assets.filter(active);
  const currentPositions = positions.filter(active);
  const currentDebts = debts.filter(active);
  const positionTotal = roundCents(currentPositions.reduce((sum, item) => sum + value(item.current_value), 0));
  const assetTotal = roundCents(currentAssets.reduce((sum, item) => sum + value(item.current_value), 0));
  const available30d = roundCents(
    currentPositions.filter((item) => isPositionAvailableIn30Days(item, today)).reduce((sum, item) => sum + value(item.current_value), 0)
    + currentAssets.filter(isAssetAvailableIn30Days).reduce((sum, item) => sum + value(item.current_value), 0)
  );
  const totalAssets = roundCents(positionTotal + assetTotal);
  const totalDebts = roundCents(currentDebts.reduce((sum, item) => sum + value(item.current_balance), 0));
  const dueIn12m = roundCents(currentDebts.reduce((sum, item) => sum + debtDueIn12Months(item), 0));
  const productiveTotal = roundCents(positionTotal + currentAssets.filter((item) => ASSET_CATEGORIES[item.category]?.productive).reduce((sum, item) => sum + value(item.current_value), 0));
  const passiveIncomeMonthly = roundCents(productiveTotal * PASSIVE_INCOME_MONTHLY_RATE);
  const livingCost = value(settings.monthly_cost_of_living);
  const debtById = new Map(currentDebts.map((item) => [item.id, item]));
  return {
    available30d,
    longTerm: roundCents(totalAssets - available30d),
    totalAssets,
    dueIn12m,
    dueAfter12m: roundCents(Math.max(0, totalDebts - dueIn12m)),
    totalDebts,
    netWorth: roundCents(totalAssets - totalDebts),
    shortTermCoverage: dueIn12m > 0 ? Math.round(available30d / dueIn12m * 100) / 100 : null,
    productiveTotal,
    passiveIncomeMonthly,
    independencePct: livingCost > 0 ? Math.round(passiveIncomeMonthly / livingCost * 1000) / 10 : null,
    linkedAssets: currentAssets.filter((item) => item.linked_debt_id && debtById.has(item.linked_debt_id)).map((item) => {
      const debt = debtById.get(item.linked_debt_id);
      return { assetId: item.id, name: item.name, value: value(item.current_value), debtId: debt.id, debtName: debt.creditor, debtBalance: value(debt.current_balance), equity: roundCents(value(item.current_value) - value(debt.current_balance)) };
    })
  };
}
