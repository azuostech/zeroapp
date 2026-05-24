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

function normalizeTurma(rawTurma) {
  const turma = String(rawTurma || '').trim();
  return turma || null;
}

function getAccessibleTiers(tier) {
  const normalized = normalizeUserTier(tier);
  if (normalized === 'DESPERTAR') return ['LIVRE'];

  const idx = TIER_SEQUENCE.indexOf(normalized);
  if (idx < 0) return ['LIVRE'];
  return TIER_SEQUENCE.slice(0, idx + 1);
}

function parseDateOnly(dateValue) {
  const value = String(dateValue || '').trim();
  if (!value) return null;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isDisponivelHoje(dateValue) {
  const dataLiberacao = parseDateOnly(dateValue);
  if (!dataLiberacao) return true;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje >= dataLiberacao;
}

function formatarData(dateValue) {
  const parsed = parseDateOnly(dateValue);
  if (!parsed) return '';
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function canPreviewForTurma(itemTurma, userTurma) {
  const requiredTurma = normalizeTurma(itemTurma);
  if (!requiredTurma) return true;
  return normalizeTurma(userTurma) === requiredTurma;
}

function isTierAcessivel(requiredTier, accessibleTiers) {
  const normalizedRequired = String(requiredTier || '').trim().toUpperCase();
  return accessibleTiers.includes(normalizedRequired);
}

function mapUnlockedItem(item) {
  return {
    id: item?.id,
    title: item?.title,
    description: item?.description,
    content_type: item?.content_type,
    tier_required: item?.tier_required,
    turma_exclusiva: item?.turma_exclusiva || null,
    thumbnail_url: item?.thumbnail_url || null,
    order_index: item?.order_index,
    disponivel_em: item?.disponivel_em || null,
    url: item?.url || null,
    locked: false,
    locked_reason: null
  };
}

function mapDateLockedItem(item) {
  const dataFormatada = formatarData(item?.disponivel_em);
  return {
    id: item?.id,
    title: item?.title,
    description: item?.description,
    content_type: item?.content_type,
    tier_required: item?.tier_required,
    turma_exclusiva: item?.turma_exclusiva || null,
    thumbnail_url: item?.thumbnail_url || null,
    order_index: item?.order_index,
    disponivel_em: item?.disponivel_em || null,
    url: null,
    locked: true,
    locked_reason: dataFormatada ? `Disponível em ${dataFormatada}` : 'Ainda não disponível'
  };
}

function mapTierLockedItem(item) {
  return {
    id: item?.id,
    title: item?.title,
    description: item?.description,
    content_type: item?.content_type,
    tier_required: item?.tier_required,
    turma_exclusiva: item?.turma_exclusiva || null,
    thumbnail_url: item?.thumbnail_url || null,
    order_index: item?.order_index,
    disponivel_em: item?.disponivel_em || null,
    url: null,
    locked: true,
    locked_reason: `Disponível na fase ${String(item?.tier_required || 'superior').toUpperCase()}`
  };
}

function sortByOrderIndex(a, b) {
  return Number(a?.order_index || 0) - Number(b?.order_index || 0);
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
  const turmaUsuario = normalizeTurma(profile?.turma);
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  const accessibleTiers = isAdmin ? [...TIER_SEQUENCE] : getAccessibleTiers(tierUsuario);

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

  const unlocked = [];
  const dateLocked = [];
  for (const item of content || []) {
    if (isDisponivelHoje(item?.disponivel_em)) {
      unlocked.push(mapUnlockedItem(item));
    } else {
      dateLocked.push(mapDateLockedItem(item));
    }
  }

  let tierLocked = [];
  let blockedWarning = null;

  if (!isAdmin) {
    try {
      const serviceSupabase = getServiceSupabase();
      let blockedQuery = serviceSupabase
        .from('member_area_content')
        .select('*')
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      if (tipo) {
        blockedQuery = blockedQuery.eq('content_type', tipo);
      }

      const { data: allPublished, error: blockedError } = await blockedQuery;
      if (blockedError) {
        throw new Error(blockedError.message || 'blocked_content_query_failed');
      }

      tierLocked = (allPublished || [])
        .filter((item) => canPreviewForTurma(item?.turma_exclusiva, turmaUsuario))
        .filter((item) => !isTierAcessivel(item?.tier_required, accessibleTiers))
        .map((item) => mapTierLockedItem(item));
    } catch (blockedErr) {
      blockedWarning = blockedErr instanceof Error ? blockedErr.message : 'blocked_catalog_unavailable';
      console.error('[api/content] blocked preview unavailable:', blockedWarning);
    }
  }

  const blockedById = new Map();
  for (const item of [...dateLocked, ...tierLocked]) {
    const key = String(item?.id || '');
    if (!key) continue;
    if (!blockedById.has(key)) blockedById.set(key, item);
  }
  const blocked = Array.from(blockedById.values()).sort(sortByOrderIndex);
  return NextResponse.json({
    content: unlocked.sort(sortByOrderIndex),
    bloqueado: blocked,
    tier_usuario: tierUsuario,
    turma_usuario: turmaUsuario,
    blocked_warning: blockedWarning
  });
}
