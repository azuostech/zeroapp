import { describe, expect, it } from 'vitest';
import { coinClaimsForContribution, coinClaimsForReserve } from './investments.coins';

describe('coins de investimentos', () => {
  it('ignora aporte abaixo do mínimo', () => expect(coinClaimsForContribution({ movement: { kind: 'aporte', amount: 30, occurred_on: '2026-11-02' }, isFirstEverContribution: true })).toEqual([]));
  it('premia primeiro aporte e o mês', () => expect(coinClaimsForContribution({ movement: { kind: 'aporte', amount: 300, occurred_on: '2026-11-02' }, isFirstEverContribution: true }).map((item) => item.key)).toEqual(['first', 'month:2026-11']));
  it('premia níveis alcançados da reserva', () => expect(coinClaimsForReserve({ months: 2.4, targetMonths: 6 }).map((item) => item.key)).toEqual(['reserve_level:1', 'reserve_level:2']));
});
