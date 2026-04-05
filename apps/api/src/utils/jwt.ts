import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthPayload } from '../types.js';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN_DAYS = 7;

export const signAccessToken = (payload: AuthPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
};

export const signRefreshToken = (payload: AuthPayload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRES_IN_DAYS}d` });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthPayload;
};

export const refreshExpiryDate = () => {
  const now = new Date();
  now.setDate(now.getDate() + REFRESH_EXPIRES_IN_DAYS);
  return now;
};
