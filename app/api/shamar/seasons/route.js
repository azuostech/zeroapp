import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { awardZeroCoinsSafely } from '@/src/lib/shamar/awards';
import {
  canAccessShamarConfig,
  createAuthenticatedContext,
  loadShamarProfile,
  normalizeId,
  normalizeMoney,
  parseJsonBody,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';

async function loadConfig(supabase, triboConfigId) {
  const { data, error } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active')
    .eq('id', triboConfigId)
    .maybeSingle();

  if (error) return { config: null, error };
  return { config: data || null, error: null };
}

async function loadSeasonProgress(supabase, season, config) {
  const [contribResult, markedResult, squaresResult, pointsResult, latestIndexResult] = await Promise.all([
    supabase
      .from('shamar_contributions')
      .select('id,amount')
      .eq('season_id', season.id),
    supabase
      .from('shamar_marked_squares')
      .select('id')
      .eq('season_id', season.id),
    supabase
      .from('shamar_board_squares')
      .select('id,value')
      .eq('tribo_config_id', season.tribo_config_id),
    supabase
      .from('shamar_points_balance')
      .select('points_total')
      .eq('season_id', season.id)
      .eq('user_id', season.user_id)
      .maybeSingle(),
    supabase
      .from('shamar_index_history')
      .select('*')
      .eq('season_id', season.id)
      .eq('user_id', season.user_id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const firstError = [
    contribResult.error,
    markedResult.error,
    squaresResult.error,
    pointsResult.error,
    latestIndexResult.error
  ].find(Boolean);

  if (firstError) throw firstError;

  const contributions = contribResult.data || [];
  const squares = squaresResult.data || [];
  const totalContributed = roundMoney(contributions.reduce((sum, row) => sum + toNumber(row.amount), 0));
  const sumTotal = roundMoney(squares.reduce((sum, row) => sum + toNumber(row.value), 0));

  return {
    contributions_count: contributions.length,
    contributions_total: totalContributed,
    squares_total: squares.length,
    squares_marked: (markedResult.data || []).length,
    squares_available: Math.max(0, squares.length - (markedResult.data || []).length),
    sum_total: sumTotal,
    sum_marked: totalContributed,
    meta_total: toNumber(config.meta_total),
    progress_pct: toNumber(config.meta_total) > 0
      ? Math.round(Math.min(1, totalContributed / toNumber(config.meta_total)) * 10000) / 100
      : 0,
    shamar_points_total: toNumber(pointsResult.data?.points_total),
    current_index: latestIndexResult.data || null
  };
}

async function loadActiveSeason(supabase, userId) {
  const { data, error } = await supabase
    .from('shamar_seasons')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { season: null, error };
  return { season: data || null, error: null };
}

export async function GET() {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { season, error: seasonError } = await loadActiveSeason(context.supabase, context.user.id);
  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }

  if (!season) {
    return NextResponse.json({ season: null, progress: null });
  }

  const { config, error: configError } = await loadConfig(context.supabase, season.tribo_config_id);
  if (configError) {
    return NextResponse.json({ error: resolveShamarDbError(configError, 'shamar_config_lookup_failed') }, { status: 500 });
  }

  try {
    const progress = await loadSeasonProgress(context.supabase, season, config);
    return NextResponse.json({
      season: {
        ...season,
        config
      },
      progress
    });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_progress_lookup_failed') }, { status: 500 });
  }
}

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const triboConfigId = normalizeId(parsed.body?.tribo_config_id);
  const patrimonioInicial = parsed.body?.patrimonio_inicial === undefined
    ? 0
    : normalizeMoney(parsed.body?.patrimonio_inicial);

  if (!triboConfigId) {
    return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });
  }

  if (patrimonioInicial === null || patrimonioInicial < 0) {
    return NextResponse.json({ error: 'patrimonio_inicial_invalido' }, { status: 422 });
  }

  const shamarProfileResult = await loadShamarProfile(context.supabase, context.user.id);
  if (shamarProfileResult.error) {
    return NextResponse.json({ error: shamarProfileResult.error }, { status: 500 });
  }

  const { config, error: configError } = await loadConfig(context.supabase, triboConfigId);
  if (configError) {
    return NextResponse.json({ error: resolveShamarDbError(configError, 'shamar_config_lookup_failed') }, { status: 500 });
  }

  if (!config || !config.is_active) {
    return NextResponse.json({ error: 'config_nao_encontrada' }, { status: 404 });
  }

  if (!canAccessShamarConfig(shamarProfileResult.profile, config)) {
    return NextResponse.json({ error: 'shamar_bloqueado_para_usuario' }, { status: 403 });
  }

  const { data: existingSeason, error: existingError } = await context.supabase
    .from('shamar_seasons')
    .select('id,status,started_at')
    .eq('user_id', context.user.id)
    .eq('tribo_config_id', triboConfigId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: resolveShamarDbError(existingError, 'shamar_existing_season_lookup_failed') }, { status: 500 });
  }

  if (existingSeason) {
    return NextResponse.json(
      {
        error: 'temporada_ja_existe',
        season_id: existingSeason.id,
        status: existingSeason.status
      },
      { status: 409 }
    );
  }

  const { data: season, error: insertError } = await context.supabase
    .from('shamar_seasons')
    .insert({
      user_id: context.user.id,
      tribo_config_id: triboConfigId,
      patrimonio_inicial: patrimonioInicial
    })
    .select('*')
    .single();

  if (insertError || !season) {
    return NextResponse.json({ error: resolveShamarDbError(insertError, 'shamar_season_create_failed') }, { status: 500 });
  }

  const warnings = [];

  const { error: balanceError } = await context.supabase
    .from('shamar_points_balance')
    .upsert(
      {
        user_id: context.user.id,
        season_id: season.id,
        points_total: 0,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,season_id' }
    );

  if (balanceError) warnings.push(resolveShamarDbError(balanceError, 'shamar_points_balance_create_failed'));

  try {
    const serviceSupabase = getServiceSupabase();
    const { error: indexError } = await serviceSupabase.from('shamar_index_history').upsert(
      {
        user_id: context.user.id,
        season_id: season.id,
        calculated_at: new Date().toISOString().slice(0, 10),
        index_total: 0,
        score_constancia: 0,
        score_evolucao: 0,
        score_patrimonio: 0,
        score_participacao: 0,
        identity_level: 'guardiao'
      },
      { onConflict: 'user_id,season_id,calculated_at' }
    );

    if (indexError) warnings.push(resolveShamarDbError(indexError, 'shamar_initial_index_create_failed'));
  } catch (error) {
    warnings.push(error?.message || 'shamar_initial_index_create_failed');
  }

  const zeroCoins = await awardZeroCoinsSafely({
    userId: context.user.id,
    amount: 50,
    actionType: 'shamar_season_started',
    description: 'Temporada SHAMAR iniciada',
    metadata: {
      source: 'shamar',
      season_id: season.id,
      tribo_config_id: triboConfigId
    }
  });

  if (zeroCoins.warning) warnings.push(`ZeroCoins: ${zeroCoins.warning}`);

  return NextResponse.json(
    {
      season_id: season.id,
      tribo_config_id: triboConfigId,
      started_at: season.started_at,
      config,
      zero_coins_awarded: zeroCoins.awarded,
      zero_coins_balance: zeroCoins.balance,
      warnings
    },
    { status: 201 }
  );
}
