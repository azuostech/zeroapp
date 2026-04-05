import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';
import { gamificationService } from '../services/gamification.service.js';

const router = Router();
const schema = z.object({
  creditor: z.string().min(2),
  totalAmount: z.number().positive(),
  interestRate: z.number().optional(),
  installment: z.number().optional(),
  dueDay: z.string().optional(),
  status: z.string().optional()
});

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const items = await prisma.debt.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'desc' } });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await prisma.debt.create({ data: { ...(parsed.data as any), userId: req.user!.sub } as any });
  res.status(201).json(item);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const id = String(req.params.id);
  const before = await prisma.debt.findFirst({ where: { id, userId: req.user!.sub } });
  const result = await prisma.debt.updateMany({ where: { id, userId: req.user!.sub }, data: parsed.data as any });
  const after = await prisma.debt.findFirst({ where: { id, userId: req.user!.sub } });

  if (before?.status !== 'Quitada' && after?.status === 'Quitada') {
    await gamificationService.onDebtPaid(req.user!.sub);
  }

  res.json({ updated: result.count });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await prisma.debt.deleteMany({ where: { id: String(req.params.id), userId: req.user!.sub } });
  res.json({ deleted: result.count });
});

export default router;
