import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { assertPublicEnv, getServiceRoleKey, publicEnv } from '@/src/lib/env';

let serviceClient;

function resolveJwtRole(key) {
  const parts = String(key || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return String(payload?.role || '');
  } catch (_) {
    return null;
  }
}

function assertServiceRoleKey(key) {
  const normalized = String(key || '').trim();
  const valid = normalized.startsWith('sb_secret_') || resolveJwtRole(normalized) === 'service_role';
  if (!valid) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY invalida: configure uma chave service_role/sb_secret_ real');
  }
}

export function getServiceSupabase() {
  if (serviceClient) return serviceClient;
  assertPublicEnv();
  const serviceRoleKey = getServiceRoleKey();
  assertServiceRoleKey(serviceRoleKey);
  serviceClient = createClient(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return serviceClient;
}
