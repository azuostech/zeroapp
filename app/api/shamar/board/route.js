import { NextResponse } from 'next/server';
import {
  createAuthenticatedContext,
  getShamarWriterSupabase,
  normalizeId,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';

async function resolveSeason(supabase, userId, seasonId) {
  let query = supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status')
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

  const supabase = getShamarWriterSupabase(context.supabase);
  const [squaresResult, markedResult] = await Promise.all([
    supabase
      .from('shamar_board_squares')
      .select('id,position,value,category')
      .eq('tribo_config_id', season.tribo_config_id)
      .order('position', { ascending: true }),
    supabase
      .from('shamar_marked_squares')
      .select('square_id,contribution_id,marked_at')
      .eq('season_id', season.id)
  ]);

  if (squaresResult.error) {
    return NextResponse.json({ error: resolveShamarDbError(squaresResult.error, 'shamar_board_lookup_failed') }, { status: 500 });
  }

  if (markedResult.error) {
    return NextResponse.json({ error: resolveShamarDbError(markedResult.error, 'shamar_marked_lookup_failed') }, { status: 500 });
  }

  const markedBySquare = new Map((markedResult.data || []).map((row) => [row.square_id, row]));
  const squares = (squaresResult.data || []).map((square) => {
    const marked = markedBySquare.get(square.id);
    return {
      ...square,
      value: toNumber(square.position || square.value),
      marked: Boolean(marked),
      contribution_id: marked?.contribution_id || null,
      marked_at: marked?.marked_at || null
    };
  });

  const markedSquares = squares.filter((square) => square.marked);
  const sumTotal = roundMoney(squares.reduce((sum, square) => sum + toNumber(square.value), 0));
  const sumMarked = roundMoney(markedSquares.reduce((sum, square) => sum + toNumber(square.value), 0));

  return NextResponse.json({
    season_id: season.id,
    tribo_config_id: season.tribo_config_id,
    squares,
    stats: {
      total: squares.length,
      marked: markedSquares.length,
      available: Math.max(0, squares.length - markedSquares.length),
      sum_marked: sumMarked,
      sum_total: sumTotal
    }
  });
}
