import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

const router = Router();
const schema = z.object({
  institution: z.string().min(2),
  type: z.string().min(2),
  amount: z.number().positive(),
  date: z.coerce.date(),
  profitability: z.string().optional()
});

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const items = await prisma.investment.findMany({ where: { userId: req.user!.sub }, orderBy: { date: 'desc' } });
  res.json(items);
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await prisma.investment.create({ data: { ...(parsed.data as any), userId: req.user!.sub } as any });
  res.status(201).json(item);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const result = await prisma.investment.updateMany({
    where: { id: String(req.params.id), userId: req.user!.sub },
    data: parsed.data as any
  });
  res.json({ updated: result.count });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await prisma.investment.deleteMany({ where: { id: String(req.params.id), userId: req.user!.sub } });
  res.json({ deleted: result.count });
});

export default router;
