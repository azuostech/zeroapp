import { describe, expect, it } from 'vitest';
import { isDebtEligibleForClearedCoins } from './patrimony-coins-policy';

describe('debt cleared anti-farm', () => {
  const now = new Date('2026-10-28T12:00:00Z').getTime();
  it('blocks recent student debts and accepts debts at least seven days old', () => {
    expect(isDebtEligibleForClearedCoins({ debt: { created_at: '2026-10-27T12:00:00Z' }, actorRole: 'aluno', now, minimumAgeDays: 7 })).toBe(false);
    expect(isDebtEligibleForClearedCoins({ debt: { created_at: '2026-10-21T12:00:00Z' }, actorRole: 'aluno', now, minimumAgeDays: 7 })).toBe(true);
  });
  it('allows mentor payoff regardless of age', () => {
    expect(isDebtEligibleForClearedCoins({ debt: { created_at: '2026-10-28T11:59:00Z' }, actorRole: 'mentor', now })).toBe(true);
  });
});
