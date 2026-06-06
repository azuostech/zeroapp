import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { normalizeGoogleDriveImageUrl } from '@/src/lib/drive-image-url';

export const ALLOWED_TIERS = new Set(['LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);
export const ALLOWED_VISIBILITY = new Set(['visible', 'locked', 'hidden']);

export async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user) {
    return {
      supabase,
      error: NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    };
  }

  if (!profile || profile.role !== 'admin') {
    return {
      supabase,
      error: NextResponse.json({ error: 'forbidden' }, { status: 403 })
    };
  }

  return { supabase, user };
}

export function normalizeId(value) {
  const id = String(value || '').trim();
  return id || null;
}

export function normalizeNullableText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function normalizeTier(value, fallback = null) {
  const normalized = String(value || fallback || '')
    .trim()
    .toUpperCase();
  return ALLOWED_TIERS.has(normalized) ? normalized : null;
}

export function normalizeVisibility(value, fallback = 'visible') {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();
  return ALLOWED_VISIBILITY.has(normalized) ? normalized : null;
}

export function normalizeOrderIndex(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeThumbnail(value) {
  const normalized = normalizeNullableText(value);
  return normalized ? normalizeGoogleDriveImageUrl(normalized) : null;
}

export async function parseJsonBody(request) {
  try {
    return { body: await request.json() };
  } catch (_) {
    return { error: NextResponse.json({ error: 'invalid_json' }, { status: 400 }) };
  }
}
