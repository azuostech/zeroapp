import type { Request } from 'express';
import type { Role, Tier } from '@prisma/client';

export interface AuthPayload {
  sub: string;
  role: Role;
  tier: Tier;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
