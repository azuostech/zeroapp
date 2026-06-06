import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

const TIER_SEQUENCE = ['LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];

export async function requireUser() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return {
      supabase,
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    };
  }

  return { supabase, user, profile };
}

export function normalizeId(value) {
  const id = String(value || '').trim();
  return id || null;
}

export function normalizeTier(value) {
  const tier = String(value || '').trim().toUpperCase();
  if (TIER_SEQUENCE.includes(tier)) return tier;
  return 'DESPERTAR';
}

export function canAccessTier(requiredTier, userTier, isAdmin = false) {
  if (isAdmin) return true;
  const required = String(requiredTier || 'LIVRE').trim().toUpperCase();
  if (required === 'LIVRE') return true;
  const userIndex = TIER_SEQUENCE.indexOf(normalizeTier(userTier));
  const requiredIndex = TIER_SEQUENCE.indexOf(required);
  return userIndex >= 0 && requiredIndex >= 0 && userIndex >= requiredIndex;
}

export function isAvailableToday(dateValue) {
  const value = String(dateValue || '').trim();
  if (!value) return true;

  const releaseDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(releaseDate.getTime())) return true;
  releaseDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= releaseDate;
}

export function mapProgressByContent(progressRows) {
  const progressByContent = new Map();
  for (const item of progressRows || []) {
    if (item?.content_id) progressByContent.set(item.content_id, item);
  }
  return progressByContent;
}

export function flattenSessionContent(sessions) {
  return (sessions || []).flatMap((session) => session?.member_area_content || []);
}
