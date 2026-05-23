import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

const VALID_TYPES = new Set(['video', 'pdf', 'article', 'tool']);
const TIER_SEQUENCE = ['LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];

function normalizeContentType(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return VALID_TYPES.has(value) ? value : null;
}

function normalizeUserTier(rawTier) {
  const tier = String(rawTier || '').trim().toUpperCase();
  if (tier === 'MOVIMENTO' || tier === 'ACELERACAO' || tier === 'AUTOGOVERNO') return tier;
  return 'DESPERTAR';
}

function getAccessibleTiers(tier) {
  const normalized = normalizeUserTier(tier);
  if (normalized === 'DESPERTAR') return ['LIVRE'];

  const idx = TIER_SEQUENCE.indexOf(normalized);
  if (idx < 0) return ['LIVRE'];
  return TIER_SEQUENCE.slice(0, idx + 1);
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = normalizeContentType(searchParams.get('tipo'));
  const tierUsuario = normalizeUserTier(profile?.tier);
  const accessibleTiers = getAccessibleTiers(tierUsuario);

  let query = supabase
    .from('member_area_content')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (tipo) {
    query = query.eq('content_type', tipo);
  }

  const { data: content, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message || 'content_query_failed' }, { status: 500 });
  }

  let blocked = [];
  let blockedWarning = null;

  try {
    const serviceSupabase = getServiceSupabase();
    let blockedQuery = serviceSupabase
      .from('member_area_content')
      .select('id,title,description,content_type,tier_required,thumbnail_url,order_index,is_published')
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (tipo) {
      blockedQuery = blockedQuery.eq('content_type', tipo);
    }

    const { data: allPublished, error: blockedError } = await blockedQuery;
    if (blockedError) {
      throw new Error(blockedError.message || 'blocked_content_query_failed');
    }

    blocked = (allPublished || [])
      .filter((item) => !accessibleTiers.includes(String(item?.tier_required || '').toUpperCase()))
      .map((item) => ({
        ...item,
        locked: true
      }));
  } catch (blockedErr) {
    blockedWarning = blockedErr instanceof Error ? blockedErr.message : 'blocked_catalog_unavailable';
    console.error('[api/content] blocked preview unavailable:', blockedWarning);
  }

  return NextResponse.json({
    content: content || [],
    bloqueado: blocked,
    tier_usuario: tierUsuario,
    blocked_warning: blockedWarning
  });
}
