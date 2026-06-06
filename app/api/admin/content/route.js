import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { normalizeGoogleDriveImageUrl } from '@/src/lib/drive-image-url';

const ALLOWED_TYPES = new Set(['video', 'pdf', 'article', 'tool']);
const ALLOWED_TIERS = new Set(['LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);
const ALLOWED_VISIBILITY = new Set(['visible', 'locked', 'hidden']);

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

function normalizeNullableText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeOrderIndex(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeVisibility(value, fallback = 'visible') {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();
  return ALLOWED_VISIBILITY.has(normalized) ? normalized : null;
}

function normalizeDateOnly(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }

  const normalized = String(value).trim();
  if (!normalized) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return { ok: false, value: null };

  const [year, month, day] = normalized.split('-').map((part) => Number.parseInt(part, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!isValid) return { ok: false, value: null };
  return { ok: true, value: normalized };
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

export async function GET(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tipo = normalizeType(searchParams.get('tipo'));
  const tier = normalizeTier(searchParams.get('tier'));

  let query = supabase.from('member_area_content').select('*').order('order_index', { ascending: true }).order('created_at', { ascending: false });

  if (tipo) query = query.eq('content_type', tipo);
  if (tier) query = query.eq('tier_required', tier);

  const { data, error: queryError } = await query;
  if (queryError) {
    return NextResponse.json({ error: queryError.message || 'content_list_failed' }, { status: 500 });
  }

  return NextResponse.json({ content: data || [] });
}

export async function POST(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const title = normalizeNullableText(body?.title);
  const description = normalizeNullableText(body?.description);
  const contentType = normalizeType(body?.content_type);
  const tierRequired = normalizeTier(body?.tier_required);
  const url = normalizeNullableText(body?.url);
  const thumbnailUrlRaw = normalizeNullableText(body?.thumbnail_url);
  const thumbnailUrl = thumbnailUrlRaw ? normalizeGoogleDriveImageUrl(thumbnailUrlRaw) : null;
  const orderIndex = normalizeOrderIndex(body?.order_index, 0);
  const isPublished = typeof body?.is_published === 'boolean' ? body.is_published : false;
  const turmaExclusiva = normalizeNullableText(body?.turma_exclusiva);
  const disponivelEm = normalizeDateOnly(body?.disponivel_em);
  const sessionId = normalizeNullableText(body?.session_id);
  const visibility = normalizeVisibility(body?.visibility, 'visible');

  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 422 });
  }

  if (!contentType) {
    return NextResponse.json({ error: 'invalid_content_type' }, { status: 422 });
  }

  if (!tierRequired) {
    return NextResponse.json({ error: 'invalid_tier' }, { status: 422 });
  }

  if (!url) {
    return NextResponse.json({ error: 'url_required' }, { status: 422 });
  }

  if (!disponivelEm.ok) {
    return NextResponse.json({ error: 'invalid_disponivel_em' }, { status: 422 });
  }

  if (!visibility) {
    return NextResponse.json({ error: 'invalid_visibility' }, { status: 422 });
  }

  const { data, error: insertError } = await supabase
    .from('member_area_content')
    .insert({
      title,
      description,
      content_type: contentType,
      tier_required: tierRequired,
      url,
      thumbnail_url: thumbnailUrl,
      order_index: orderIndex,
      is_published: isPublished,
      turma_exclusiva: turmaExclusiva,
      disponivel_em: disponivelEm.value,
      session_id: sessionId,
      visibility
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'content_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ content: data }, { status: 201 });
}
