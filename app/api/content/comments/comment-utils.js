import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export async function requireUser() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user) {
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

export function normalizeBody(value, minLength = 1) {
  const body = String(value || '').trim();
  if (body.length < minLength) return null;
  return body;
}

export async function parseJsonBody(request) {
  try {
    return { body: await request.json() };
  } catch (_) {
    return { error: NextResponse.json({ error: 'invalid_json' }, { status: 400 }) };
  }
}

export function mapAuthor(profile) {
  return {
    name: profile?.full_name || 'Mentorado',
    tier: profile?.tier || 'DESPERTAR',
    is_mentor: profile?.is_admin === true || profile?.role === 'admin'
  };
}
