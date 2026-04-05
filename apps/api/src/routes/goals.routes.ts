import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';
import { gamificationService } from '../services/gamification.service.js';

const router = Router();
const schema = z.object({
  name: z.string().min(2),
  targetAmount: z.number().positive(),
  deadline: z.string().min(4),
  monthlyAmount: z.number().optional(),
  currentAmount: z.number().optional(),
  completed: z.boolean().optional()
});

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const items = await prisma.goal.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'desc' } });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await prisma.goal.create({ data: { ...(parsed.data as any), userId: req.user!.sub } as any });
  res.status(201).json(item);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const id = String(req.params.id);
  const before = await prisma.goal.findFirst({ where: { id, userId: req.user!.sub } });
  const result = await prisma.goal.updateMany({ where: { id, userId: req.user!.sub }, data: parsed.data as any });
  const after = await prisma.goal.findFirst({ where: { id, userId: req.user!.sub } });

  if (before?.completed === false && after?.completed === true) {
    await gamificationService.onGoalCompleted(req.user!.sub);
  }

  res.json({ updated: result.count });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await prisma.goal.deleteMany({ where: { id: String(req.params.id), userId: req.user!.sub } });
  res.json({ deleted: result.count });
});

router.patch('/:id/complete', async (req: AuthRequest, res) => {
  const goal = await prisma.goal.updateMany({
    where: { id: String(req.params.id), userId: req.user!.sub },
    data: { completed: true }
  });

  if (goal.count > 0) {
    await gamificationService.onGoalCompleted(req.user!.sub);
  }

  res.json({ updated: goal.count });
});

export default router;
