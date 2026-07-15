import 'server-only';
import { createHmac } from 'node:crypto';
import { getServiceSupabase } from '@/src/lib/supabase/service';

const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_SECONDS = 60 * 60;

function getClientIp(request) {
  const forwarded = String(request.headers.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim();
  const candidate = forwarded || String(request.headers.get('x-real-ip') || '').trim();
  return candidate.slice(0, 128) || 'unknown';
}

function getRateLimitSecret() {
  const secret = String(process.env.SIGNUP_RATE_LIMIT_SECRET || process.env.CRON_SECRET || '').trim();
  if (secret.length < 24) {
    throw new Error('signup_rate_limit_secret_missing');
  }
  return secret;
}

export async function consumeSignupRateLimit(request) {
  const ip = getClientIp(request);
  const keyHash = createHmac('sha256', getRateLimitSecret()).update(`signup:${ip}`).digest('hex');
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc('consume_signup_rate_limit', {
    p_key_hash: keyHash,
    p_limit: SIGNUP_LIMIT,
    p_window_seconds: SIGNUP_WINDOW_SECONDS
  });

  if (error) {
    console.error('[signup/rate-limit] consume failed:', error.message || error);
    throw new Error('signup_rate_limit_unavailable');
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: result?.allowed === true,
    remaining: Math.max(0, Number(result?.remaining || 0)),
    retryAfter: Math.max(1, Number(result?.retry_after_seconds || SIGNUP_WINDOW_SECONDS))
  };
}
