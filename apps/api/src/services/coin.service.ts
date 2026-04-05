import { CoinReason, Phase, type PrismaClient } from '@prisma/client';

const phaseFromTotal = (totalCoins: number): Phase => {
  if (totalCoins >= 2001) return Phase.MULTIPLICADOR;
  if (totalCoins >= 801) return Phase.CONSTRUTOR;
  if (totalCoins >= 201) return Phase.SOBREVIVENTE;
  return Phase.BOMBEIRO;
};

export class CoinService {
  constructor(private prisma: PrismaClient) {}

  async addCoins(userId: string, amount: number, reason: CoinReason, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const totalCoins = Math.max(0, user.totalCoins + Math.max(0, amount));
      const coins = Math.max(0, user.coins + amount);
      const phase = phaseFromTotal(totalCoins);

      await tx.user.update({
        where: { id: userId },
        data: { coins, totalCoins, phase }
      });

      await tx.coinHistory.create({
        data: {
          userId,
          amount,
          reason,
          description
        }
      });

      return { coins, totalCoins, phase };
    });
  }

  async awardBadge(userId: string, badgeKey: string) {
    const badge = await this.prisma.badge.findUnique({ where: { key: badgeKey } });
    if (!badge) return;

    await this.prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id
        }
      },
      create: { userId, badgeId: badge.id },
      update: {}
    });
  }
}
