import { NextResponse } from 'next/server';
import { publishFeedEvent } from '@/src/modules/community/application/feed-publisher';
import { awardShamarPointsSafely, awardZeroCoinsSafely } from '@/src/lib/shamar/awards';
import { calculateAndPersistShamarIndex } from '@/src/lib/shamar/index-calculator';
import {
  createAuthenticatedContext,
  getShamarWriterSupabase,
  normalizeId,
  normalizeMoney,
  parseJsonBody,
  resolveShamarDbError,
  toNumber
} from '@/src/lib/shamar/api';

function normalizeCompletedSeason(season) {
  if (!season) return null;
  return {
    ...season,
    patrimonio_inicial: toNumber(season.patrimonio_inicial),
    patrimonio_final: season.patrimonio_final === null || season.patrimonio_final === undefined
      ? null
      : toNumber(season.patrimonio_final)
  };
}

async function completeClosingMission(supabase, season) {
  const { data: turmaMissions, error } = await supabase
    .from('shamar_turma_missions')
    .select('id,is_active,shamar_missions(mission_type)')
    .eq('tribo_config_id', season.tribo_config_id)
    .eq('is_active', true);

  if (error) throw error;

  const closingMission = (turmaMissions || []).find((item) => item.shamar_missions?.mission_type === 'season_closing');
  if (!closingMission) return null;

  const { data, error: completionError } = await supabase
    .from('shamar_mission_completions')
    .upsert(
      {
        turma_mission_id: closingMission.id,
        user_id: season.user_id,
        season_id: season.id
      },
      { onConflict: 'turma_mission_id,user_id', ignoreDuplicates: true }
    )
    .select('id,turma_mission_id,user_id,season_id,completed_at')
    .maybeSingle();

  if (completionError) throw completionError;
  return data || { turma_mission_id: closingMission.id, already_completed: true };
}

export async function POST(request, { params }) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const seasonId = normalizeId(params?.id);
  if (!seasonId) return NextResponse.json({ error: 'season_id_obrigatorio' }, { status: 422 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const patrimonioFinal = normalizeMoney(parsed.body?.patrimonio_final);
  if (patrimonioFinal === null || patrimonioFinal < 0) {
    return NextResponse.json({ error: 'patrimonio_final_invalido' }, { status: 422 });
  }

  const { data: season, error: seasonError } = await context.supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status,patrimonio_inicial,patrimonio_final,identity_level,started_at,ended_at')
    .eq('id', seasonId)
    .eq('user_id', context.user.id)
    .maybeSingle();

  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }

  if (!season) return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });
  if (season.status !== 'active') {
    return NextResponse.json({
      already_closed: true,
      season: normalizeCompletedSeason(season),
      status: season.status
    });
  }

  const serviceSupabase = getShamarWriterSupabase(context.supabase);
  const endedAt = new Date().toISOString();
  const { data: completedSeason, error: updateError } = await serviceSupabase
    .from('shamar_seasons')
    .update({
      status: 'completed',
      patrimonio_final: patrimonioFinal,
      ended_at: endedAt
    })
    .eq('id', season.id)
    .eq('user_id', context.user.id)
    .eq('status', 'active')
    .select('id,user_id,tribo_config_id,status,patrimonio_inicial,patrimonio_final,identity_level,started_at,ended_at')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: resolveShamarDbError(updateError, 'shamar_season_complete_failed') }, { status: 500 });
  }

  if (!completedSeason) {
    return NextResponse.json({
      already_closed: true,
      season: normalizeCompletedSeason(season),
      status: season.status
    });
  }

  const warnings = [];
  let indexResult = null;
  let closingMission = null;

  try {
    indexResult = await calculateAndPersistShamarIndex({
      supabase: serviceSupabase,
      userId: context.user.id,
      seasonId: completedSeason.id
    });
  } catch (error) {
    warnings.push(error?.message || 'shamar_index_recalculate_failed');
  }

  const shamarPoints = await awardShamarPointsSafely({
    userId: context.user.id,
    seasonId: completedSeason.id,
    amount: 500,
    sourceType: 'season_complete',
    sourceId: completedSeason.id,
    description: 'Encerramento da temporada SHAMAR'
  });
  if (shamarPoints.warning) warnings.push(`Pontos SHAMAR: ${shamarPoints.warning}`);

  const zeroCoins = await awardZeroCoinsSafely({
    userId: context.user.id,
    amount: 500,
    actionType: 'shamar_season_complete',
    description: 'Temporada SHAMAR concluida',
    metadata: {
      source: 'shamar',
      season_id: completedSeason.id,
      patrimonio_final: patrimonioFinal
    }
  });
  if (zeroCoins.warning) warnings.push(`ZeroCoins: ${zeroCoins.warning}`);

  try {
    closingMission = await completeClosingMission(serviceSupabase, completedSeason);
  } catch (error) {
    warnings.push(error?.message || 'shamar_closing_mission_failed');
  }

  try {
    await serviceSupabase
      .from('shamar_invites')
      .update({ status: 'cancelled', updated_at: endedAt })
      .eq('tribo_config_id', completedSeason.tribo_config_id)
      .eq('inviter_user_id', context.user.id)
      .eq('status', 'pending');
  } catch (error) {
    warnings.push(error?.message || 'shamar_pending_invites_cancel_failed');
  }

  await publishFeedEvent(context.supabase, {
    userId: context.user.id,
    eventType: 'shamar_season_completed',
    title: 'Temporada SHAMAR concluída',
    body: `Patrimônio final declarado: R$ ${toNumber(patrimonioFinal).toLocaleString('pt-BR')}.`,
    metadata: {
      source: 'shamar',
      season_id: completedSeason.id,
      patrimonio_final: patrimonioFinal,
      identity_level: indexResult?.identity_level || completedSeason.identity_level
    }
  });

  return NextResponse.json({
    season: normalizeCompletedSeason(completedSeason),
    index: indexResult?.index || null,
    identity_level: indexResult?.identity_level || completedSeason.identity_level,
    closing_mission: closingMission,
    shamar_points: shamarPoints,
    zero_coins: zeroCoins,
    warnings
  });
}
