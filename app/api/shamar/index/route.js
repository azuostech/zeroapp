import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { calculateAndPersistShamarIndex } from '@/src/lib/shamar/index-calculator';
import {
  createAuthenticatedContext,
  normalizeId,
  parseJsonBody,
  resolveShamarDbError
} from '@/src/lib/shamar/api';

async function resolveSeason(supabase, userId, seasonId) {
  let query = supabase
    .from('shamar_seasons')
    .select('id,user_id,status,tribo_config_id')
    .eq('user_id', userId);

  if (seasonId) {
    query = query.eq('id', seasonId);
  } else {
    query = query.eq('status', 'active').order('started_at', { ascending: false }).limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { season: null, error };
  return { season: data || null, error: null };
}

async function recalculateIndex(userId, seasonId) {
  const serviceSupabase = getServiceSupabase();
  return calculateAndPersistShamarIndex({
    supabase: serviceSupabase,
    userId,
    seasonId
  });
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const requestedSeasonId = normalizeId(searchParams.get('season_id'));

  const { season, error: seasonError } = await resolveSeason(context.supabase, context.user.id, requestedSeasonId);
  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }

  if (!season) {
    return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });
  }

  const { data: latestIndex, error: indexError } = await context.supabase
    .from('shamar_index_history')
    .select('*')
    .eq('user_id', context.user.id)
    .eq('season_id', season.id)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (indexError) {
    return NextResponse.json({ error: resolveShamarDbError(indexError, 'shamar_index_lookup_failed') }, { status: 500 });
  }

  if (latestIndex) {
    return NextResponse.json({
      season_id: season.id,
      index: latestIndex,
      recalculated: false
    });
  }

  try {
    const result = await recalculateIndex(context.user.id, season.id);
    return NextResponse.json({
      season_id: season.id,
      ...result,
      recalculated: true
    });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_index_calculate_failed') }, { status: 500 });
  }
}

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const requestedSeasonId = normalizeId(parsed.body?.season_id);
  const { season, error: seasonError } = await resolveSeason(context.supabase, context.user.id, requestedSeasonId);
  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }

  if (!season) {
    return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });
  }

  try {
    const result = await recalculateIndex(context.user.id, season.id);
    return NextResponse.json({
      season_id: season.id,
      ...result,
      recalculated: true
    });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_index_calculate_failed') }, { status: 500 });
  }
}
