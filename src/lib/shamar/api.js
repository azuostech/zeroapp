import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export const PROOF_ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

export function jsonError(error, status = 500, details = undefined) {
  return NextResponse.json(
    details ? { error, details } : { error },
    { status }
  );
}

export async function parseJsonBody(request) {
  try {
    return { body: await request.json() };
  } catch (_) {
    return { error: jsonError('invalid_json', 400) };
  }
}

export function normalizeId(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function normalizeMoney(value) {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

export function normalizePositiveMoney(value) {
  const parsed = normalizeMoney(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function normalizeIsoDate(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function sanitizeFilename(filename) {
  const normalized = String(filename || '')
    .split(/[\\/]/)
    .pop()
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);

  return normalized || `comprovante_${Date.now()}`;
}

export function profileHasTurma(userTurmas, requiredTurma) {
  const required = splitTurmas(requiredTurma);
  if (required.length === 0) return true;

  const user = new Set(splitTurmas(userTurmas));
  return required.some((turma) => user.has(turma));
}

export function canAccessShamarConfig(profile, config) {
  if (!profile || !config) return false;
  if (profile.status !== 'active') return false;
  return profileHasTurma(profile.turma, config.turma);
}

function splitTurmas(value) {
  return String(value || '')
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function createAuthenticatedContext() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return {
      supabase,
      error: jsonError('unauthorized', 401)
    };
  }

  if (profile.status !== 'active') {
    return {
      supabase,
      user,
      profile,
      error: jsonError('inactive_account', 403)
    };
  }

  return { supabase, user, profile };
}

export async function createAdminContext() {
  const context = await createAuthenticatedContext();
  if (context.error) return context;

  const isAdmin = context.profile?.role === 'admin' || context.profile?.is_admin === true;
  if (!isAdmin) {
    return {
      ...context,
      error: jsonError('forbidden', 403)
    };
  }

  return context;
}

function resolveJwtRole(key) {
  const parts = String(key || '').split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return String(payload?.role || '').trim();
  } catch (_) {
    return null;
  }
}

export function hasUsableServiceRoleKey() {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!key) return false;
  if (key.startsWith('sb_publishable_')) return false;
  if (key.startsWith('sb_secret_')) return true;
  return resolveJwtRole(key) === 'service_role';
}

export function getShamarWriterSupabase(fallbackSupabase) {
  if (!hasUsableServiceRoleKey()) return fallbackSupabase;

  try {
    return getServiceSupabase();
  } catch (_) {
    return fallbackSupabase;
  }
}

export async function loadShamarProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,status,role,tier,turma,shamar_unlocked')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return {
      profile: null,
      error: resolveShamarDbError(error, 'profile_lookup_failed')
    };
  }

  return { profile: data || null, error: null };
}

export function resolveShamarDbError(error, fallback = 'shamar_request_failed') {
  const code = String(error?.code || '').trim();

  if (code === '42P01') {
    return 'Tabelas SHAMAR nao encontradas. Execute scripts/migrate-shamar-etapa-a.sql no Supabase antes de usar esta API.';
  }

  if (code === '42703') {
    return 'Coluna SHAMAR nao encontrada. Execute scripts/migrate-shamar-etapa-a.sql no Supabase antes de usar esta API.';
  }

  if (code === '42501') {
    return 'Sem permissao para acessar dados SHAMAR. Verifique autenticacao e policies RLS.';
  }

  return error?.message || fallback;
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
