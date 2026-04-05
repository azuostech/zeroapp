import type { NextFunction, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import type { AuthRequest } from '../types.js';

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token ausente' });
  }

  try {
    const token = auth.slice('Bearer '.length);
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
};
