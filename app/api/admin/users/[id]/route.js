import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

const ALLOWED_STATUS = new Set(['active', 'disabled', 'pending']);
const ALLOWED_TIERS = new Set(['DESPERTAR', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);
const ALLOWED_FIELDS = new Set(['status', 'tier', 'turma', 'full_name', 'phone']);

function normalizeNullableText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export async function PATCH(request, { params }) {
  const userId = String(params?.id || '').trim();
  if (!userId) {
    return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const updates = {};

  for (const [field, value] of Object.entries(body || {})) {
    if (!ALLOWED_FIELDS.has(field)) continue;

    if (field === 'status') {
      const normalizedStatus = String(value || '')
        .trim()
        .toLowerCase();
      if (!ALLOWED_STATUS.has(normalizedStatus)) {
        return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
      }
      updates.status = normalizedStatus;
      continue;
    }

    if (field === 'tier') {
      const normalizedTier = String(value || '')
        .trim()
        .toUpperCase();
      if (!ALLOWED_TIERS.has(normalizedTier)) {
        return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
      }
      updates.tier = normalizedTier;
      continue;
    }

    if (field === 'turma') {
      updates.turma = normalizeNullableText(value);
      continue;
    }

    if (field === 'full_name') {
      updates.full_name = normalizeNullableText(value);
      continue;
    }

    if (field === 'phone') {
      updates.phone = normalizeNullableText(value);
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'no_updates' }, { status: 422 });
  }

  if (updates.status === 'active') {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = user.id;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id,email,full_name,phone,status,tier,turma')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'user_update_failed' }, { status: 500 });
  }

  await recordAdminAudit({
    supabase,
    adminUserId: user.id,
    targetUserId: userId,
    action: 'update',
    resource: 'user_profile',
    resourceId: userId,
    metadata: { updates }
  });

  return NextResponse.json({ user: data });
}
