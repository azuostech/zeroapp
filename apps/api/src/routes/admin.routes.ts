import { CoinReason, Tier } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { gamificationService } from '../services/gamification.service.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tier: true,
      coins: true,
      totalCoins: true,
      phase: true,
      isActive: true,
      createdAt: true
    }
  });
  res.json(users);
});

router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      transactions: { orderBy: { date: 'desc' }, take: 20 },
      goals: true,
      debts: true,
      investments: true,
      badges: { include: { badge: true } }
    }
  });

  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
});

router.patch('/users/:id/coins', async (req, res) => {
  const parsed = z.object({ amount: z.number().int() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const result = await gamificationService.coinService.addCoins(
    req.params.id,
    parsed.data.amount,
    CoinReason.ADMIN_AJUSTE,
    'Ajuste manual por admin'
  );

  res.json(result);
});

router.patch('/users/:id/tier', async (req, res) => {
  const parsed = z.object({ tier: z.nativeEnum(Tier) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const tier = parsed.data.tier as Tier;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { tier }
  });

  if (tier === Tier.ACELERACAO || tier === Tier.AUTOGOVERNO) {
    await gamificationService.onTierActivated(user.id, tier);
  }

  res.json(user);
});

router.patch('/users/:id/active', async (req, res) => {
  const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(user);
});

router.get('/metrics', async (_req, res) => {
  const [users, activeUsers, transactions, goals, debts, totalCoins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.financialTransaction.count(),
    prisma.goal.count(),
    prisma.debt.count(),
    prisma.user.aggregate({ _sum: { totalCoins: true } })
  ]);

  res.json({ users, activeUsers, transactions, goals, debts, totalCoins: totalCoins._sum.totalCoins ?? 0 });
});

router.post('/codes', async (req, res) => {
  const parsed = z
    .object({
      code: z.string().min(4),
      tier: z.nativeEnum(Tier),
      coinBonus: z.number().int().nonnegative(),
      expiresAt: z.string().datetime().optional()
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const code = await prisma.workshopCode.create({
    data: {
      code: parsed.data.code,
      tier: parsed.data.tier,
      coinBonus: parsed.data.coinBonus,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt as string) : undefined
    }
  });

  res.status(201).json(code);
});

router.get('/codes', async (_req, res) => {
  const codes = await prisma.workshopCode.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(codes);
});

router.delete('/codes/:id', async (req, res) => {
  await prisma.workshopCode.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
