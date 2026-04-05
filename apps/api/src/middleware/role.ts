import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '../types.js';

export const requireRole = (role: 'ADMIN' | 'USER') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
};
