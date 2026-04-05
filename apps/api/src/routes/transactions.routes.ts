import { Router } from 'express';
import { TransactionType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';
import { toMonthKey } from '../utils/month.js';
import { gamificationService } from '../services/gamification.service.js';

const router = Router();

const createSchema = z.object({
  type: z.nativeEnum(TransactionType),
  description: z.string().min(2),
  category: z.string().min(2),
  subtype: z.string().optional(),
  amount: z.number().positive(),
  date: z.coerce.date()
});

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const month = String(req.query.month ?? toMonthKey(new Date()));
  const items = await prisma.financialTransaction.findMany({
    where: { userId: req.user!.sub, month },
    orderBy: { date: 'desc' }
  });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const date = new Date(parsed.data.date);
  const month = toMonthKey(date);

  const item = await prisma.financialTransaction.create({
    data: {
      ...(parsed.data as any),
      date,
      month,
      userId: req.user!.sub
    } as any
  });

  await gamificationService.onFirstTransactionOfMonth(req.user!.sub, month);
  await gamificationService.tryCompleteMonth(req.user!.sub, month);

  res.status(201).json(item);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const data = { ...parsed.data } as Record<string, unknown>;
  if (parsed.data.date) {
    const date = new Date(parsed.data.date);
    data.date = date;
    data.month = toMonthKey(date);
  }

  const item = await prisma.financialTransaction.updateMany({
    where: { id: String(req.params.id), userId: req.user!.sub },
    data: data as any
  });

  res.json({ updated: item.count });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await prisma.financialTransaction.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.sub }
  });
  res.json({ deleted: result.count });
});

router.get('/summary/:month', async (req: AuthRequest, res) => {
  const month = String(req.params.month);
  const items = await prisma.financialTransaction.findMany({
    where: { userId: req.user!.sub, month }
  });

  const entradas = items.filter((i) => i.type === TransactionType.ENTRADA).reduce((a, b) => a + b.amount, 0);
  const saidas = items.filter((i) => i.type === TransactionType.SAIDA).reduce((a, b) => a + b.amount, 0);

  res.json({ entradas, saidas, saldo: entradas - saidas });
});

export default router;
