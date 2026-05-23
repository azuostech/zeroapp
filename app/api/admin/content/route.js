import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

const ALLOWED_TYPES = new Set(['video', 'pdf', 'article', 'tool']);
const ALLOWED_TIERS = new Set(['LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);

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
  const thumbnailUrl = normalizeNullableText(body?.thumbnail_url);
  const orderIndex = normalizeOrderIndex(body?.order_index, 0);
  const isPublished = typeof body?.is_published === 'boolean' ? body.is_published : false;

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
      is_published: isPublished
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'content_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ content: data }, { status: 201 });
}
