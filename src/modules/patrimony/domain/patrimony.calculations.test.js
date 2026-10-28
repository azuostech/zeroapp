import { describe, expect, it } from 'vitest';
import { annualToMonthlyRate, cheaperReferenceRate, computeMetrics, impliedMonthlyRate, monthlyToAnnualRate, netWorthZeroProgress, payoffSimulation, prioritizeDebts, progressTone } from './patrimony.calculations';
import { ESTADO_A, HOJE, SETTINGS } from './patrimony.fixtures';

describe('patrimony calculations', () => {
  it('computes current metrics', () => {
    expect(computeMetrics({ ...HOJE, settings: SETTINGS })).toMatchObject({ total_assets: 66000, total_debts: 72710, net_worth: -6710, productive_assets: 14000, reserve_total: 4200, monthly_interest: 2932.27, monthly_debt_outflow: 4840, debt_income_ratio: 40.33, expensive_debt_total: 11570, expensive_debt_count: 2, overdue_count: 0, reserve_months: 0.7 });
  });
  it('computes baseline metrics', () => {
    expect(computeMetrics({ ...ESTADO_A, settings: SETTINGS })).toMatchObject({ total_assets: 61900, total_debts: 89380, net_worth: -27480, monthly_interest: 4451.68, monthly_debt_outflow: 5900, debt_income_ratio: 49.17, expensive_debt_total: 22200, overdue_count: 2, reserve_total: 0 });
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
