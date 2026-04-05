import type { User } from '@prisma/client';

export const sanitizeUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  tier: user.tier,
  phase: user.phase,
  coins: user.coins,
  totalCoins: user.totalCoins,
  showInRanking: user.showInRanking,
  referralCode: user.referralCode
});
