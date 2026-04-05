import type { NextFunction, Response } from 'express';
import { Tier } from '@prisma/client';
import type { AuthRequest } from '../types.js';

const order: Record<Tier, number> = {
  DESPERTAR: 0,
  MOVIMENTO: 1,
  ACELERACAO: 2,
  AUTOGOVERNO: 3
};

export const requireTier = (tier: Tier) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (order[req.user.tier] < order[tier]) {
      return res.status(403).json({ message: 'Tier insuficiente' });
    }

    next();
  };
};
