import { INVESTMENT_COINS, MIN_CONTRIBUTION_FOR_COINS } from './investments.constants';

export function coinClaimsForContribution({ movement, isFirstEverContribution }) {
  if (movement?.kind !== 'aporte' || Number(movement.amount) < MIN_CONTRIBUTION_FOR_COINS) return [];
  const month = String(movement.occurred_on).slice(0, 7); const claims = [];
  if (isFirstEverContribution) claims.push({ key: 'first', action: 'investment_first', amount: INVESTMENT_COINS.first });
  claims.push({ key: `month:${month}`, action: 'investment_month', amount: INVESTMENT_COINS.month });
  return claims;
}

export function coinClaimsForReserve({ months, targetMonths }) {
  const levels = Math.min(Math.floor(Number(months || 0)), Number(targetMonths || 0));
  return Array.from({ length: Math.max(0, levels) }, (_, index) => ({ key: `reserve_level:${index + 1}`, action: 'reserve_month_reached', amount: INVESTMENT_COINS.reserveLevel }));
}
