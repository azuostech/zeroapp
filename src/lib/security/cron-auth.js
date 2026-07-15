import 'server-only';
import { timingSafeEqual } from 'node:crypto';

export function isCronRequestAuthorized(request) {
  const secret = String(process.env.CRON_SECRET || '');
  const authorization = String(request.headers.get('authorization') || '');
  if (secret.length < 24 || !authorization.startsWith('Bearer ')) return false;

  const received = Buffer.from(authorization.slice('Bearer '.length), 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
