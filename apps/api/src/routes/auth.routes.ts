import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, refreshExpiryDate } from '../utils/jwt.js';
import { sanitizeUser } from '../utils/user.js';
import { gamificationService } from '../services/gamification.service.js';
import type { AuthRequest } from '../types.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  referralCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const googleSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  googleId: z.string().min(4),
  avatar: z.string().url().optional()
});

const issueSession = async (
  userId: string,
  role: 'ADMIN' | 'USER',
  tier: 'DESPERTAR' | 'MOVIMENTO' | 'ACELERACAO' | 'AUTOGOVERNO'
) => {
  const payload = { sub: userId, role, tier };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: refreshExpiryDate()
    }
  });

  return { accessToken, refreshToken };
};

router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const { name, email, password, referralCode } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'E-mail já cadastrado' });
  }

  const hashed = await bcrypt.hash(password, 10);

  const referrer = referralCode
    ? await prisma.user.findUnique({ where: { referralCode } })
    : null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      referredById: referrer?.id
    }
  });

  await gamificationService.onRegistration(user.id);
  if (referrer) {
    await gamificationService.onReferralRegistered(referrer.id);
  }

  const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const session = await issueSession(updatedUser.id, updatedUser.role, updatedUser.tier);
  res.status(201).json({ user: sanitizeUser(updatedUser), ...session });
});

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.password) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const match = await bcrypt.compare(parsed.data.password, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: 'Usuário bloqueado' });
  }

  const session = await issueSession(user.id, user.role, user.tier);
  res.json({ user: sanitizeUser(user), ...session });
});

router.post('/google', authLimiter, async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const { email, name, googleId, avatar } = parsed.data;

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, googleId, avatar },
    create: { name, email, googleId, avatar, password: null }
  });

  if (!user.isActive) {
    return res.status(403).json({ message: 'Usuário bloqueado' });
  }

  const hasHistory = await prisma.coinHistory.count({ where: { userId: user.id } });
  if (hasHistory === 0) {
    await gamificationService.onRegistration(user.id);
  }

  const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const session = await issueSession(updatedUser.id, updatedUser.role, updatedUser.tier);
  res.json({ user: sanitizeUser(updatedUser), ...session });
});

router.post('/refresh', async (req, res) => {
  const token = req.body?.refreshToken as string | undefined;
  if (!token) {
    return res.status(400).json({ message: 'Refresh token obrigatório' });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Refresh token inválido ou expirado' });
  }

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuário inválido' });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, tier: user.tier });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Refresh token inválido' });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.body?.refreshToken as string | undefined;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  res.status(204).send();
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  res.json({ user: sanitizeUser(user) });
});

export default router;
