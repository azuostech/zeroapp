import { describe, expect, it } from 'vitest';
import { ESTADO_A, HOJE, SETTINGS } from '../domain/patrimony.fixtures';
import { calculateNetWorthProjection, enrichAssets, enrichDebts, resolveComparisonPoint } from './patrimony-enrichment';

const withIds = (items, prefix) => items.map((item, index) => ({ ...item, id: `${prefix}-${index}` }));

describe('patrimony API enrichment', () => {
  it('uses settings to calculate the debt income ratio and baseline progress', () => {
    const current = withIds(HOJE.debts, 'debt');
    const baseline = { debts: withIds(ESTADO_A.debts, 'debt'), assets: [] };
    const result = enrichDebts({ debts: current, settings: SETTINGS, baselineSnapshot: baseline });
    expect(result.totals.debt_income_ratio).toBe(40.33);
    expect(result.totals.expensive_interest_share).toBeCloseTo(50.43, 1);
    expect(result.debts[0]).toMatchObject({ baselineBalance: 15800, balanceDelta: -7380 });
    expect(result.debts[0].progress.pct).toBe(47);
  });

  it('links assets to debts and identifies assets created after baseline', () => {
    const debts = [{ id: 'debt-1', creditor: 'BV', current_balance: 34900 }];
    const assets = [{ id: 'asset-1', category: 'bem', current_value: 52000, linked_debt_id: 'debt-1' }];
    const result = enrichAssets({ assets, debts, settings: SETTINGS, baselineSnapshot: { assets: [] } });
    expect(result.assets[0].linkedDebt.creditor).toBe('BV');
    expect(result.assets[0].isNewSinceBaseline).toBe(true);
    expect(result.reserveTargetValue).toBe(36000);
  });

  it('projects the zero crossing only for a positive trend', () => {
    expect(calculateNetWorthProjection([
      { date: '2026-09-25', metrics: { net_worth: -14300 } },
      { date: '2026-10-27', metrics: { net_worth: -6710 } }
    ])).toMatchObject({ daysToZero: 29, estimatedDate: '2026-11-25' });
    expect(calculateNetWorthProjection([
      { date: '2026-09-25', metrics: { net_worth: -5000 } },
      { date: '2026-10-27', metrics: { net_worth: -6710 } }
    ])).toBeNull();
  });

  it('resolves baseline, milestone and current comparison points', () => {
    const milestones = [
      { id: 'a', sequence: 0, label: 'Estado A', milestone_date: '2026-08-14', metrics: {}, snapshot: {} },
      { id: 'b', sequence: 1, label: 'Sessão 2', milestone_date: '2026-09-04', metrics: {}, snapshot: {}, mentor_note: 'Avançou' }
    ];
    const current = { id: 'current', label: 'Hoje' };
    expect(resolveComparisonPoint({ reference: 'baseline', milestones, current }).id).toBe('a');
    expect(resolveComparisonPoint({ reference: 'b', milestones, current })).toMatchObject({ id: 'b', mentorNote: 'Avançou' });
    expect(resolveComparisonPoint({ reference: 'current', milestones, current })).toBe(current);
    expect(resolveComparisonPoint({ reference: 'missing', milestones, current })).toBeNull();
  });
});
