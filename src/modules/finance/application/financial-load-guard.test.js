import { describe, expect, it } from 'vitest';
import { shouldApplyFinancialLoad } from './financial-load-guard';

describe('financial month load guard', () => {
  it('accepts the latest response for the currently selected period', () => {
    expect(shouldApplyFinancialLoad({
      mounted: true,
      requestSequence: 3,
      latestSequence: 3,
      requestedPeriodKey: '2026-05',
      selectedPeriodKey: '2026-05'
    })).toBe(true);
  });

  it('rejects a late response from a previously selected month', () => {
    expect(shouldApplyFinancialLoad({
      mounted: true,
      requestSequence: 2,
      latestSequence: 3,
      requestedPeriodKey: '2026-08',
      selectedPeriodKey: '2026-05'
    })).toBe(false);
  });

  it('rejects a response when the selection changed without another completed request', () => {
    expect(shouldApplyFinancialLoad({
      mounted: true,
      requestSequence: 3,
      latestSequence: 3,
      requestedPeriodKey: '2026-08',
      selectedPeriodKey: '2026-05'
    })).toBe(false);
  });
});
