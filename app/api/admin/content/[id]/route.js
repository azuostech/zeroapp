import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

const ALLOWED_TYPES = new Set(['video', 'pdf', 'article', 'tool']);
const ALLOWED_TIERS = new Set(['LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);
const ALLOWED_FIELDS = new Set([
  'title',
  'description',
  'content_type',
  'tier_required',
  'url',
  'thumbnail_url',
  'order_index',
  'is_published'
]);

function normalizeNullableText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeType(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return ALLOWED_TYPES.has(normalized) ? normalized : null;
}

function normalizeTier(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return ALLOWED_TIERS.has(normalized) ? normalized : null;
}

function normalizeOrderIndex(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function requireAdmin() {
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

function resolveContentId(params) {
  const id = String(params?.id || '').trim();
  return id || null;
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const contentId = resolveContentId(params);
  if (!contentId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { data, error: queryError } = await supabase.from('member_area_content').select('*').eq('id', contentId).single();

  if (queryError) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ content: data });
}

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const contentId = resolveContentId(params);
  if (!contentId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates = {};

  for (const [field, value] of Object.entries(body || {})) {
    if (!ALLOWED_FIELDS.has(field)) continue;

    if (field === 'title') {
      const normalized = normalizeNullableText(value);
      if (!normalized) return NextResponse.json({ error: 'title_required' }, { status: 422 });
      updates.title = normalized;
      continue;
    }

    if (field === 'description') {
      updates.description = normalizeNullableText(value);
      continue;
    }

    if (field === 'content_type') {
      const normalized = normalizeType(value);
      if (!normalized) return NextResponse.json({ error: 'invalid_content_type' }, { status: 422 });
      updates.content_type = normalized;
      continue;
    }

    if (field === 'tier_required') {
      const normalized = normalizeTier(value);
      if (!normalized) return NextResponse.json({ error: 'invalid_tier' }, { status: 422 });
      updates.tier_required = normalized;
      continue;
    }

    if (field === 'url') {
      const normalized = normalizeNullableText(value);
      if (!normalized) return NextResponse.json({ error: 'url_required' }, { status: 422 });
      updates.url = normalized;
      continue;
    }

    if (field === 'thumbnail_url') {
      updates.thumbnail_url = normalizeNullableText(value);
      continue;
    }

    if (field === 'order_index') {
      const normalized = normalizeOrderIndex(value);
      if (normalized === null) return NextResponse.json({ error: 'invalid_order_index' }, { status: 422 });
      updates.order_index = normalized;
      continue;
    }

    if (field === 'is_published') {
      if (typeof value !== 'boolean') return NextResponse.json({ error: 'invalid_publish_value' }, { status: 422 });
      updates.is_published = value;
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'no_updates' }, { status: 422 });
  }

  const { data, error: updateError } = await supabase
    .from('member_area_content')
    .update(updates)
    .eq('id', contentId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'content_update_failed' }, { status: 500 });
  }

  return NextResponse.json({ content: data });
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const contentId = resolveContentId(params);
  if (!contentId) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from('member_area_content').delete().eq('id', contentId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'content_delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
