import { NextResponse } from 'next/server';
import { createAdminContext, normalizeId, parseJsonBody, resolveShamarDbError, toNumber } from '@/src/lib/shamar/api';
import { generateBoard, getBoardStats, validateBoard } from '@/src/lib/shamar/board-generator';

export async function POST(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const triboConfigId = normalizeId(parsed.body?.tribo_config_id);
  if (!triboConfigId) {
    return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });
  }

  const { data: config, error: configError } = await context.supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total')
    .eq('id', triboConfigId)
    .maybeSingle();

  if (configError) {
    return NextResponse.json({ error: resolveShamarDbError(configError, 'shamar_config_lookup_failed') }, { status: 500 });
  }

  if (!config) {
    return NextResponse.json({ error: 'config_nao_encontrada' }, { status: 404 });
  }

  const { count, error: countError } = await context.supabase
    .from('shamar_board_squares')
    .select('id', { count: 'exact', head: true })
    .eq('tribo_config_id', triboConfigId);

  if (countError) {
    return NextResponse.json({ error: resolveShamarDbError(countError, 'shamar_board_count_failed') }, { status: 500 });
  }

  if (Number(count || 0) > 0) {
    return NextResponse.json(
      {
        error: 'tabuleiro_ja_existe',
        squares_count: Number(count || 0)
      },
      { status: 409 }
    );
  }

  let squares;
  try {
    squares = generateBoard(toNumber(config.meta_total));
  } catch (error) {
    return NextResponse.json(
      {
        error: 'erro_na_geracao_do_tabuleiro',
        details: error?.message || 'board_generation_failed'
      },
      { status: 500 }
    );
  }

  const validation = validateBoard(squares, toNumber(config.meta_total));
  if (!validation.valid) {
    return NextResponse.json({ error: 'validacao_do_tabuleiro_falhou', validation }, { status: 500 });
  }

  const rows = squares.map((square) => ({
    tribo_config_id: triboConfigId,
    position: square.position,
    value: square.value,
    category: square.category
  }));

  const { error: insertError } = await context.supabase
    .from('shamar_board_squares')
    .insert(rows);

  if (insertError) {
    return NextResponse.json({ error: resolveShamarDbError(insertError, 'shamar_board_insert_failed') }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      turma: config.turma,
      meta_total: toNumber(config.meta_total),
      squares_count: squares.length,
      validation,
      stats: getBoardStats(squares)
    },
    { status: 201 }
  );
}

export async function GET(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const triboConfigId = normalizeId(searchParams.get('tribo_config_id'));
  if (!triboConfigId) {
    return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });
  }

  const { data, error } = await context.supabase
    .from('shamar_board_squares')
    .select('id,position,value,category')
    .eq('tribo_config_id', triboConfigId)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_board_lookup_failed') }, { status: 500 });
  }

  const squares = (data || []).map((square) => ({
    ...square,
    value: toNumber(square.value)
  }));

  return NextResponse.json({
    squares,
    stats: getBoardStats(squares)
  });
}
