import { NextResponse } from 'next/server';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import {
  createAdminContext,
  getShamarWriterSupabase,
  normalizeId,
  normalizeIsoDate,
  normalizeMoney,
  parseJsonBody,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';
import { generateBoard, getBoardStats, validateBoard } from '@/src/lib/shamar/board-generator';

const ALLOWED_DURATIONS = new Set([30, 90, 180, 365]);

function countByStatus(seasons) {
  return (seasons || []).reduce(
    (acc, season) => {
      const key = String(season.status || 'unknown');
      acc[key] = Number(acc[key] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, active: 0, completed: 0, abandoned: 0 }
  );
}

function boardStatsForConfig(squares) {
  const rows = (squares || []).map((square) => ({
    ...square,
    value: toNumber(square.value)
  }));

  return getBoardStats(rows);
}

async function loadConfigs(supabase) {
  const { data: configs, error } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const configRows = configs || [];
  const ids = configRows.map((config) => config.id);

  if (!ids.length) return [];

  const [squaresResult, seasonsResult] = await Promise.all([
    supabase
      .from('shamar_board_squares')
      .select('tribo_config_id,value,category')
      .in('tribo_config_id', ids),
    supabase
      .from('shamar_seasons')
      .select('id,tribo_config_id,status,patrimonio_inicial,patrimonio_final,identity_level,started_at,ended_at')
      .in('tribo_config_id', ids)
  ]);

  if (squaresResult.error) throw squaresResult.error;
  if (seasonsResult.error) throw seasonsResult.error;

  const squaresByConfig = new Map();
  for (const square of squaresResult.data || []) {
    const list = squaresByConfig.get(square.tribo_config_id) || [];
    list.push(square);
    squaresByConfig.set(square.tribo_config_id, list);
  }

  const seasonsByConfig = new Map();
  for (const season of seasonsResult.data || []) {
    const list = seasonsByConfig.get(season.tribo_config_id) || [];
    list.push(season);
    seasonsByConfig.set(season.tribo_config_id, list);
  }

  return configRows.map((config) => {
    const squares = squaresByConfig.get(config.id) || [];
    const seasons = seasonsByConfig.get(config.id) || [];

    return {
      ...config,
      meta_total: toNumber(config.meta_total),
      board_stats: boardStatsForConfig(squares),
      seasons_stats: countByStatus(seasons),
      seasons
    };
  });
}

export async function GET() {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const configs = await loadConfigs(supabase);
    return NextResponse.json({ configs });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_configs_lookup_failed') }, { status: 500 });
  }
}

export async function POST(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const turma = String(parsed.body?.turma || '').trim();
  const metaTotal = normalizeMoney(parsed.body?.meta_total);
  const durationDays = Number(parsed.body?.duration_days || 0);
  const startedAt = normalizeIsoDate(parsed.body?.started_at);

  if (!turma) return NextResponse.json({ error: 'turma_obrigatoria' }, { status: 422 });
  if (metaTotal === null || metaTotal <= 0) return NextResponse.json({ error: 'meta_total_invalida' }, { status: 422 });
  if (!ALLOWED_DURATIONS.has(durationDays)) return NextResponse.json({ error: 'duration_days_invalido' }, { status: 422 });
  if (!startedAt) return NextResponse.json({ error: 'started_at_invalido' }, { status: 422 });

  let squares;
  try {
    squares = generateBoard(metaTotal);
  } catch (error) {
    return NextResponse.json({ error: 'erro_na_geracao_do_tabuleiro', details: error?.message || 'board_generation_failed' }, { status: 500 });
  }

  const validation = validateBoard(squares, metaTotal);
  if (!validation.valid) {
    return NextResponse.json({ error: 'validacao_do_tabuleiro_falhou', validation }, { status: 500 });
  }

  const supabase = getShamarWriterSupabase(context.supabase);

  const { data: config, error: insertError } = await supabase
    .from('shamar_tribo_configs')
    .insert({
      turma,
      meta_total: metaTotal,
      duration_days: durationDays,
      started_at: startedAt,
      created_by: context.user.id
    })
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by,created_at')
    .single();

  if (insertError || !config) {
    return NextResponse.json({ error: resolveShamarDbError(insertError, 'shamar_config_create_failed') }, { status: 500 });
  }

  const boardRows = squares.map((square) => ({
    tribo_config_id: config.id,
    position: square.position,
    value: square.value,
    category: square.category
  }));

  const { error: boardError } = await supabase.from('shamar_board_squares').insert(boardRows);
  if (boardError) {
    await supabase.from('shamar_tribo_configs').delete().eq('id', config.id);
    return NextResponse.json({ error: resolveShamarDbError(boardError, 'shamar_board_insert_failed') }, { status: 500 });
  }

  await recordAdminAudit({
    supabase: context.supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'create',
    resource: 'shamar_tribo_config',
    resourceId: config.id,
    metadata: {
      turma,
      meta_total: metaTotal,
      duration_days: durationDays,
      started_at: startedAt,
      board_squares: squares.length
    }
  });

  return NextResponse.json(
    {
      config: {
        ...config,
        meta_total: toNumber(config.meta_total),
        board_stats: getBoardStats(squares),
        seasons_stats: countByStatus([])
      },
      validation
    },
    { status: 201 }
  );
}

export async function PATCH(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const id = normalizeId(parsed.body?.id);
  const isActive = parsed.body?.is_active;

  if (!id) return NextResponse.json({ error: 'config_id_obrigatorio' }, { status: 422 });
  if (typeof isActive !== 'boolean') return NextResponse.json({ error: 'is_active_invalido' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);
  const { data, error } = await supabase
    .from('shamar_tribo_configs')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by,created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_config_update_failed') }, { status: 500 });
  }

  await recordAdminAudit({
    supabase: context.supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: isActive ? 'reactivate' : 'close',
    resource: 'shamar_tribo_config',
    resourceId: id,
    metadata: { is_active: isActive }
  });

  return NextResponse.json({
    config: {
      ...data,
      meta_total: roundMoney(data.meta_total)
    }
  });
}
