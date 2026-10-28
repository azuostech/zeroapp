import { describe, expect, it } from 'vitest';
import { computeMetrics } from './patrimony.calculations';
import { compareMetrics, daysBetween, pickShareHighlight, verdict } from './patrimony.compare';
import { ESTADO_A, HOJE, SETTINGS } from './patrimony.fixtures';

describe('patrimony comparisons', () => {
  const comparison = compareMetrics(computeMetrics({ ...ESTADO_A, settings: SETTINGS }), computeMetrics({ ...HOJE, settings: SETTINGS }));
  it('compares all indicators', () => {
    expect(comparison).toMatchObject({ improvedCount: 7, worsenedCount: 0, totalCount: 7 });
    expect(comparison.indicators.find((item) => item.key === 'net_worth').delta).toBe(20770);
    expect(comparison.indicators.find((item) => item.key === 'expensive_debt_total').deltaPct).toBeCloseTo(-47.88, 2);
  });
  it('creates verdict and highlight', () => {
    expect(verdict(comparison)).toMatchObject({ title: 'Está acontecendo.', subtitle: '7 de 7 indicadores melhoraram.' });
    expect(pickShareHighlight(comparison.indicators)).toBe('Cortei pela metade a dívida cara.');
    expect(daysBetween('2026-08-14', '2026-10-27')).toBe(74);
  });
});
