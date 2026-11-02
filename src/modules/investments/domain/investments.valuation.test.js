import { describe, expect, it } from 'vitest';
import { averagePrice, cashFlows, curveValue, dailyIndexFactor, investedAmount, ipcaFactor, monthReturn, positionReturn, preFactor } from './investments.valuation';

describe('valuation de investimentos', () => {
  it('compõe CDI diário', () => {
    const factor = dailyIndexFactor({ series: [{ ref_date: '2026-01-02', value: 0.055131 }, { ref_date: '2026-01-05', value: 0.055131 }], from: '2026-01-01', to: '2026-01-05' });
    expect(factor).toBeCloseTo(1.0011029, 7);
  });

  it('calcula curva prefixada em 252 dias úteis', () => {
    expect(preFactor(12.8, 252)).toBeCloseTo(1.128, 10);
    expect(curveValue({ movements: [{ kind: 'aporte', amount: 1000, occurred_on: '2025-01-02' }], method: 'pre_curve', rate: 12.8, asOf: '2026-01-02' }).value).toBe(1128);
  });

  it('combina IPCA mensal e taxa real', () => {
    const ipcaMonthly = [{ ref_date: '2026-01-01', value: 0.5 }, { ref_date: '2026-02-01', value: 0.4 }];
    expect(ipcaFactor({ ipcaMonthly, from: '2026-01-01', to: '2026-03-01' }).factor).toBeCloseTo(1.00902, 6);
    const result = curveValue({ movements: [{ kind: 'aporte', amount: 1000, occurred_on: '2026-01-01' }], method: 'ipca_curve', rate: 6, ipcaMonthly, asOf: '2026-03-01' });
    expect(result.value).toBeCloseTo(1018.16, 2);
  });

  it('aplica cada fluxo desde sua data', () => {
    const series = [{ ref_date: '2026-01-02', value: 0.05 }, { ref_date: '2026-02-02', value: 0.05 }, { ref_date: '2026-03-02', value: 0.05 }];
    const movements = [{ kind: 'aporte', amount: 1000, occurred_on: '2026-01-01' }, { kind: 'resgate', amount: 300, occurred_on: '2026-02-01' }];
    expect(cashFlows(movements)).toEqual([{ date: '2026-01-01', amount: 1000 }, { date: '2026-02-01', amount: -300 }]);
    expect(curveValue({ movements, method: 'cdi_curve', rate: 100, series, asOf: '2026-03-02' }).value).toBeCloseTo(701.2, 2);
  });

  it('calcula aporte líquido, preço médio e retornos', () => {
    expect(investedAmount([{ kind: 'aporte', amount: 600, occurred_on: '2026-01-01' }, { kind: 'aporte', amount: 500, occurred_on: '2026-02-01' }])).toBe(1100);
    expect(averagePrice([{ kind: 'aporte', amount: 1182, quantity: 120 }])).toBe(9.85);
    expect(positionReturn({ current_value: 1050, invested_amount: 1100 })).toEqual({ abs: -50, pct: -4.55 });
    expect(monthReturn({ startValue: 16200, endValue: 16932, netFlows: 600 }).abs).toBe(132);
  });
});
