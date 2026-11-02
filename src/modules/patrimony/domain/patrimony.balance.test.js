import { describe, expect, it } from 'vitest';
import { computeBalanceSheet, debtDueIn12Months } from './patrimony.balance';
import { HOJE, SETTINGS } from './patrimony.fixtures';

const positions = [
  { status: 'ativa', asset_class: 'renda_fixa_bancaria', liquidity_days: 0, current_value: 4230 },
  { status: 'ativa', asset_class: 'tesouro', liquidity_days: 1, current_value: 1520 },
  { status: 'ativa', asset_class: 'renda_fixa_bancaria', maturity_date: '2028-03-15', current_value: 2100 },
  { status: 'ativa', asset_class: 'previdencia', current_value: 6380 },
  { status: 'ativa', asset_class: 'tesouro', liquidity_days: 1, current_value: 1050 },
  { status: 'ativa', asset_class: 'fii', liquidity_days: 2, current_value: 1152 }
];

describe('balanço patrimonial', () => {
  it('calcula os indicadores do mockup', () => {
    const debts = HOJE.debts.map((item, index) => ({ ...item, id: `d${index}` }));
    const assets = [{ id: 'a1', category: 'bem', name: 'Veículo', current_value: 52000, liquidity: 'iliquido', linked_debt_id: 'd3' }];
    expect(computeBalanceSheet({ assets, positions, debts, settings: SETTINGS, today: '2026-11-01' })).toMatchObject({ available30d: 7952, longTerm: 60480, totalAssets: 68432, dueIn12m: 47770, dueAfter12m: 24940, totalDebts: 72710, netWorth: -4278, shortTermCoverage: 0.17, passiveIncomeMonthly: 82.16, independencePct: 1.4 });
  });
  it('retorna cobertura nula sem dívidas e independência nula sem custo', () => {
    expect(computeBalanceSheet({ settings: {}, today: '2026-11-01' })).toMatchObject({ shortTermCoverage: null, independencePct: null });
  });
  it('limita parcelas ao saldo restante', () => {
    expect(debtDueIn12Months({ status: 'ativa', is_installment: true, installments_total: 10, installments_paid: 7, installment_amount: 1000, current_balance: 2500 })).toBe(2500);
  });
});
