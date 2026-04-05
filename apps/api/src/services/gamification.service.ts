import { CoinReason, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { CoinService } from './coin.service.js';

const coinService = new CoinService(prisma);

export const gamificationService = {
  async onRegistration(userId: string) {
    await coinService.addCoins(userId, 50, CoinReason.CADASTRO, 'Bônus de cadastro');
  },

  async onFirstTransactionOfMonth(userId: string, month: string) {
    const count = await prisma.financialTransaction.count({ where: { userId, month } });
    if (count === 1) {
      await coinService.addCoins(userId, 10, CoinReason.PRIMEIRO_LANCAMENTO_MES, `Primeiro lançamento em ${month}`);
      await coinService.awardBadge(userId, 'primeiro_lancamento');
    }
  },

  async tryCompleteMonth(userId: string, month: string) {
    const [hasIn, hasOut, hasGoalOrDebt] = await Promise.all([
      prisma.financialTransaction.count({ where: { userId, month, type: TransactionType.ENTRADA } }),
      prisma.financialTransaction.count({ where: { userId, month, type: TransactionType.SAIDA } }),
      Promise.all([
        prisma.goal.count({ where: { userId } }),
        prisma.debt.count({ where: { userId } })
      ]).then(([g, d]) => g > 0 || d > 0)
    ]);

    if (hasIn > 0 && hasOut > 0 && hasGoalOrDebt) {
      await coinService.addCoins(userId, 100, CoinReason.MES_COMPLETO, `Mês ${month} completo`);
      await coinService.awardBadge(userId, 'primeiro_mes_completo');
    }
  },

  async onGoalCompleted(userId: string) {
    await coinService.addCoins(userId, 150, CoinReason.META_CONCLUIDA, 'Meta concluída');
    await coinService.awardBadge(userId, 'meta_concluida');
  },

  async onDebtPaid(userId: string) {
    await coinService.addCoins(userId, 200, CoinReason.DIVIDA_QUITADA, 'Dívida quitada');
    await coinService.awardBadge(userId, 'divida_quitada');
  },

  async onRedeemWorkshop(userId: string, amount: number) {
    await coinService.addCoins(userId, amount, CoinReason.RESGATE_MOVIMENTO, 'Código de ingresso resgatado');
  },

  async onTierActivated(userId: string, tier: 'ACELERACAO' | 'AUTOGOVERNO') {
    if (tier === 'ACELERACAO') {
      await coinService.addCoins(userId, 300, CoinReason.ACELERACAO_ATIVA, 'Aceleração ativada');
      return;
    }
    await coinService.addCoins(userId, 600, CoinReason.AUTOGOVERNO_ATIVO, 'Autogoverno ativado');
  },

  async onReferralRegistered(referrerId: string) {
    await coinService.addCoins(referrerId, 80, CoinReason.INDICACAO, 'Indicação confirmada');
    await coinService.awardBadge(referrerId, 'indicacao');
  },

  coinService
};
