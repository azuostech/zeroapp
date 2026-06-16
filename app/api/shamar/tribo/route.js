import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import {
  createAuthenticatedContext,
  normalizeId,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';

function displayName(profile) {
  const name = String(profile?.full_name || '').trim();
  if (name) return name.split(/\s+/).slice(0, 2).join(' ');
  const email = String(profile?.email || '').trim();
  return email.includes('@') ? email.split('@')[0] : 'Guardiao';
}

function avatarInitial(profile) {
  return displayName(profile).charAt(0).toUpperCase() || 'G';
}

async function resolveSeasonAndConfig(supabase, userId, configId) {
  if (configId) {
    const { data: season, error: seasonError } = await supabase
      .from('shamar_seasons')
      .select('id,user_id,tribo_config_id,status')
      .eq('user_id', userId)
      .eq('tribo_config_id', configId)
      .maybeSingle();

    if (seasonError) return { season: null, config: null, error: seasonError };
    if (!season) return { season: null, config: null, error: null };

    const { data: config, error: configError } = await supabase
      .from('shamar_tribo_configs')
      .select('id,turma,meta_total,duration_days,started_at,ends_at')
      .eq('id', configId)
      .maybeSingle();

    return { season, config: config || null, error: configError || null };
  }

  const { data: season, error: seasonError } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) return { season: null, config: null, error: seasonError };
  if (!season) return { season: null, config: null, error: null };

  const { data: config, error: configError } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at')
    .eq('id', season.tribo_config_id)
    .maybeSingle();

  return { season, config: config || null, error: configError || null };
}

function latestIndexBySeason(indexRows) {
  const latest = new Map();

  for (const row of indexRows || []) {
    if (!latest.has(row.season_id)) latest.set(row.season_id, row);
  }

  return latest;
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const requestedConfigId = normalizeId(searchParams.get('tribo_config_id'));
  const { season, config, error } = await resolveSeasonAndConfig(context.supabase, context.user.id, requestedConfigId);

  if (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_tribo_context_failed') }, { status: 500 });
  }

  if (!season || !config) {
    return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });
  }

  try {
    const serviceSupabase = getServiceSupabase();
    const { data: seasons, error: seasonsError } = await serviceSupabase
      .from('shamar_seasons')
      .select('id,user_id,status,identity_level,started_at')
      .eq('tribo_config_id', config.id);

    if (seasonsError) throw seasonsError;

    const seasonIds = (seasons || []).map((item) => item.id);
    const userIds = [...new Set((seasons || []).map((item) => item.user_id))];

    const [profilesResult, contributionsResult, markedResult, indexesResult] = await Promise.all([
      userIds.length > 0
        ? serviceSupabase.from('profiles').select('id,email,full_name').in('id', userIds)
        : { data: [], error: null },
      seasonIds.length > 0
        ? serviceSupabase
            .from('shamar_contributions')
            .select('id,season_id,user_id,amount,contributed_at,created_at')
            .in('season_id', seasonIds)
            .order('created_at', { ascending: false })
        : { data: [], error: null },
      seasonIds.length > 0
        ? serviceSupabase.from('shamar_marked_squares').select('id,season_id').in('season_id', seasonIds)
        : { data: [], error: null },
      seasonIds.length > 0
        ? serviceSupabase
            .from('shamar_index_history')
            .select('*')
            .in('season_id', seasonIds)
            .order('calculated_at', { ascending: false })
        : { data: [], error: null }
    ]);

    const firstError = [profilesResult.error, contributionsResult.error, markedResult.error, indexesResult.error].find(Boolean);
    if (firstError) throw firstError;

    const profilesById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
    const latestIndex = latestIndexBySeason(indexesResult.data || []);
    const contributions = contributionsResult.data || [];
    const markedRows = markedResult.data || [];
    const contributionsBySeason = new Map();
    const markedBySeason = new Map();

    for (const contribution of contributions) {
      const current = contributionsBySeason.get(contribution.season_id) || [];
      current.push(contribution);
      contributionsBySeason.set(contribution.season_id, current);
    }

    for (const marked of markedRows) {
      markedBySeason.set(marked.season_id, Number(markedBySeason.get(marked.season_id) || 0) + 1);
    }

    const ranking = (seasons || [])
      .map((item) => {
        const rows = contributionsBySeason.get(item.id) || [];
        const total = roundMoney(rows.reduce((sum, row) => sum + toNumber(row.amount), 0));
        const index = latestIndex.get(item.id);
        const profile = profilesById.get(item.user_id);

        return {
          season_id: item.id,
          user_id: item.user_id,
          current_user: item.user_id === context.user.id,
          name: displayName(profile),
          avatar: avatarInitial(profile),
          identity_level: index?.identity_level || item.identity_level || 'guardiao',
          index_total: toNumber(index?.index_total),
          score_constancia: toNumber(index?.score_constancia),
          weeks: Math.round(toNumber(index?.score_constancia) / 60),
          patrimonio: total,
          squares_marked: Number(markedBySeason.get(item.id) || 0)
        };
      })
      .sort((a, b) => b.index_total - a.index_total || b.patrimonio - a.patrimonio)
      .map((item, index) => ({ ...item, position: index + 1 }));

    const totalPatrimonio = roundMoney(contributions.reduce((sum, row) => sum + toNumber(row.amount), 0));
    const metaTotal = toNumber(config.meta_total);
    const progressPct = metaTotal > 0 ? Math.round(Math.min(1, totalPatrimonio / metaTotal) * 10000) / 100 : 0;
    const averageConstancia = ranking.length > 0
      ? Math.round(ranking.reduce((sum, row) => sum + row.score_constancia, 0) / ranking.length)
      : 0;

    const feed = contributions.slice(0, 8).map((contribution) => {
      const profile = profilesById.get(contribution.user_id);
      return {
        id: contribution.id,
        type: 'aporte',
        title: `${displayName(profile)} registrou um aporte`,
        amount: toNumber(contribution.amount),
        date: contribution.contributed_at,
        created_at: contribution.created_at
      };
    });

    return NextResponse.json({
      config,
      current_season_id: season.id,
      stats: {
        guardians: (seasons || []).length,
        patrimonio_total: totalPatrimonio,
        meta_total: metaTotal,
        progress_pct: progressPct,
        constancia_media: averageConstancia,
        squares_marked_total: markedRows.length,
        faltam: roundMoney(Math.max(0, metaTotal - totalPatrimonio))
      },
      ranking,
      feed
    });
  } catch (aggregateError) {
    return NextResponse.json({ error: resolveShamarDbError(aggregateError, 'shamar_tribo_lookup_failed') }, { status: 500 });
  }
}
