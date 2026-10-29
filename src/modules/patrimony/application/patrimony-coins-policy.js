export function isDebtEligibleForClearedCoins({ debt, actorRole, minimumAgeDays = 7, now = Date.now() }) {
  if (actorRole === 'mentor') return true;
  const createdAt = new Date(debt?.created_at).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return (now - createdAt) / 86400000 >= minimumAgeDays;
}
