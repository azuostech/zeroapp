import { describe, expect, it } from 'vitest';
import { annualToMonthlyRate, cheaperReferenceRate, computeMetrics, impliedMonthlyRate, monthlyToAnnualRate, netWorthZeroProgress, payoffSimulation, prioritizeDebts, progressTone } from './patrimony.calculations';
import { ESTADO_A, HOJE, SETTINGS } from './patrimony.fixtures';
import { GOALS as INVESTMENT_GOALS, POSITIONS as INVESTMENT_POSITIONS } from '../../investments/domain/investments.fixtures';

describe('patrimony calculations', () => {
  it('computes current metrics', () => {
    expect(computeMetrics({ ...HOJE, settings: SETTINGS })).toMatchObject({ total_assets: 66000, total_debts: 72710, net_worth: -6710, productive_assets: 14000, reserve_total: 4200, monthly_interest: 2932.27, monthly_debt_outflow: 4840, debt_income_ratio: 40.33, expensive_debt_total: 11570, expensive_debt_count: 2, overdue_count: 0, reserve_months: 0.7 });
  });
  it('computes baseline metrics', () => {
    expect(computeMetrics({ ...ESTADO_A, settings: SETTINGS })).toMatchObject({ total_assets: 61900, total_debts: 89380, net_worth: -27480, monthly_interest: 4451.68, monthly_debt_outflow: 5900, debt_income_ratio: 49.17, expensive_debt_total: 22200, overdue_count: 2, reserve_total: 0 });
  });
  it('includes investment positions without double counting migrated assets', () => {
    const metrics = computeMetrics({
      assets: [{ id: 'legacy-reserve', category: 'reserva', current_value: 1000 }, { id: 'migrated', category: 'investimento', current_value: 2000 }], debts: [], settings: { monthly_cost_of_living: 1000 },
      goals: [{ id: 'reserve', kind: 'reserva_liquidez' }, { id: 'future', kind: 'independencia' }],
      positions: [{ goal_id: 'reserve', asset_class: 'renda_fixa_bancaria', current_value: 3000, status: 'ativa' }, { goal_id: 'future', asset_class: 'acao', current_value: 2000, status: 'ativa', migrated_from_asset_id: 'migrated' }]
    });
    expect(metrics).toMatchObject({ total_assets: 6000, productive_assets: 6000, reserve_total: 4000, investments_total: 2000, investments_positions_total: 5000, variable_income_total: 2000, reserve_months: 4 });
  });
  it('matches the integrated Patrimony and Investments fixture', () => {
    const assets = HOJE.assets.filter((item) => item.category === 'bem');
    expect(computeMetrics({ assets, debts: HOJE.debts, settings: SETTINGS, positions: INVESTMENT_POSITIONS, goals: INVESTMENT_GOALS })).toMatchObject({ total_assets: 68432, total_debts: 72710, net_worth: -4278 });
  });
  it('computes rates and payoff simulations', () => {
    expect(monthlyToAnnualRate(14.5)).toBeCloseTo(407.77, 2); expect(annualToMonthlyRate(26.82)).toBeCloseTo(2, 2);
    expect(impliedMonthlyRate({ balance: 10000, installment: 528.71, remainingInstallments: 24 })).toBeCloseTo(2, 2);
    expect(impliedMonthlyRate({ balance: 10000, installment: 300, remainingInstallments: 24 })).toBeNull();
    expect(payoffSimulation({ balance: 8420, monthlyRatePct: 14.5, monthlyPayment: 1500 })).toMatchObject({ months: 13, neverPays: false });
    expect(payoffSimulation({ balance: 8420, monthlyRatePct: 14.5, monthlyPayment: 1500 }).totalInterest).toBeCloseTo(10209.17, 0);
    expect(payoffSimulation({ balance: 8420, monthlyRatePct: 3.9, monthlyPayment: 1500 }).totalInterest).toBeCloseTo(1267.12, 0);
    expect(payoffSimulation({ balance: 10000, monthlyRatePct: 10, monthlyPayment: 900 }).neverPays).toBe(true);
    expect(payoffSimulation({ balance: 5000, monthlyRatePct: 0, monthlyPayment: 500 })).toMatchObject({ months: 10, totalInterest: 0 });
  });
  it('prioritizes debts and reports progress', () => {
    const debts = HOJE.debts.map((debt, index) => ({ ...debt, id: String(index) })); const prioritized = prioritizeDebts(debts);
    expect(prioritized.map((item) => item.debt_type)).toEqual(['cartao', 'cheque_especial', 'emprestimo', 'financiamento', 'familia']);
    expect(prioritized.filter((item) => item.isExpensive)).toHaveLength(2); expect(cheaperReferenceRate(debts, debts[0])).toBe(3.9);
    expect(netWorthZeroProgress(-6710, -27480)).toBe(76); expect(netWorthZeroProgress(5000, -27480)).toBe(100); expect(netWorthZeroProgress(-1000, 2000)).toBeNull();
    expect([progressTone(76), progressTone(51), progressTone(47)]).toEqual(['green', 'gold', 'orange']);
  });
});
