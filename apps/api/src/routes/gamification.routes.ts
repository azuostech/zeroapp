import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import type { AuthRequest } from '../types.js';
import { gamificationService } from '../services/gamification.service.js';

const router = Router();
router.use(requireAuth);

router.get('/coins/history', async (req: AuthRequest, res) => {
  const items = await prisma.coinHistory.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: 'desc' }
  });
  res.json(items);
});

router.get('/missions', async (req: AuthRequest, res) => {
  const missions = await prisma.mission.findMany({
    include: {
      users: {
        where: { userId: req.user!.sub },
        select: { completedAt: true }
      }
    },
    orderBy: [{ phase: 'asc' }, { coinReward: 'asc' }]
  });

  res.json(
    missions.map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name,
      description: m.description,
      phase: m.phase,
      coinReward: m.coinReward,
      completed: Boolean(m.users[0]?.completedAt)
    }))
  );
});

router.get('/badges', async (req: AuthRequest, res) => {
  const badges = await prisma.userBadge.findMany({
    where: { userId: req.user!.sub },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' }
  });
  res.json(badges);
});

router.get('/ranking', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { showInRanking: true, isActive: true },
    select: { id: true, name: true, totalCoins: true, phase: true },
    orderBy: { totalCoins: 'desc' },
    take: 100
  });
  res.json(users);
});

router.post('/redeem', async (req: AuthRequest, res) => {
  const parsed = z.object({ code: z.string().min(4) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const workshopCode = await prisma.workshopCode.findUnique({ where: { code: parsed.data.code } });
  if (!workshopCode) return res.status(404).json({ message: 'Código inválido' });

  if (workshopCode.usedBy) return res.status(409).json({ message: 'Código já utilizado' });
  if (workshopCode.expiresAt && workshopCode.expiresAt < new Date()) {
    return res.status(410).json({ message: 'Código expirado' });
  }

  await prisma.$transaction([
    prisma.workshopCode.update({
      where: { id: workshopCode.id },
      data: { usedBy: req.user!.sub, usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: req.user!.sub },
      data: { tier: workshopCode.tier }
    })
  ]);

  await gamificationService.onRedeemWorkshop(req.user!.sub, workshopCode.coinBonus);

  res.json({ message: 'Código resgatado com sucesso', tier: workshopCode.tier, bonus: workshopCode.coinBonus });
});

export default router;
