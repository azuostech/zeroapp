import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { sendEmail } from '@/src/lib/email/email-service';
import { shamarContributionTemplate } from '@/src/lib/email/templates/shamar-contribution';
import { awardShamarPointsSafely, awardZeroCoinsSafely } from '@/src/lib/shamar/awards';
import { calculateAndPersistShamarIndex } from '@/src/lib/shamar/index-calculator';
import {
  createAuthenticatedContext,
  getShamarWriterSupabase,
  normalizeId,
  normalizeIsoDate,
  normalizePositiveMoney,
  parseJsonBody,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';

const AMOUNT_TOLERANCE = 1;

function inferMode(config) {
  const turma = String(config?.turma || '').toLowerCase();
  if (turma.includes('dupla')) return 'dupla';
  if (turma.includes('tribo')) return 'tribo';
  return 'individual';
}

function profileName(profile, user) {
  const name = String(profile?.full_name || '').trim();
  if (name) return name.split(/\s+/).slice(0, 2).join(' ');
  const email = String(profile?.email || user?.email || '').trim();
  return email.includes('@') ? email.split('@')[0] : 'Guardiao';
}

function getSiteOrigin(requestUrl) {
  const fallbackOrigin = new URL(requestUrl).origin;
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!configured) return fallbackOrigin;

  try {
    const normalized = configured.startsWith('http://') || configured.startsWith('https://') ? configured : `https://${configured}`;
    return new URL(normalized).origin;
  } catch (_) {
    return fallbackOrigin;
  }
}

function normalizeSquareIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeId).filter(Boolean))];
}

async function loadOwnedSeason(supabase, userId, seasonId) {
  const { data, error } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status')
    .eq('id', seasonId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { season: null, error };
  return { season: data || null, error: null };
}

async function loadSelectedSquares(supabase, triboConfigId, squareIds) {
  const { data, error } = await supabase
    .from('shamar_board_squares')
    .select('id,position,value,category')
    .eq('tribo_config_id', triboConfigId)
    .in('id', squareIds);

  if (error) return { squares: [], error };
  return {
    squares: (data || []).map((square) => ({
      ...square,
      value: toNumber(square.position || square.value)
    })),
    error: null
  };
}

async function loadContributionConfig(supabase, triboConfigId) {
  const { data, error } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active')
    .eq('id', triboConfigId)
    .maybeSingle();

  if (error) return { config: null, error };
  return { config: data || null, error: null };
}

async function cleanupContribution(supabase, contributionId) {
  try {
    await supabase
      .from('shamar_contributions')
      .delete()
      .eq('id', contributionId);
  } catch (_) {
    // Best effort: evita esconder o erro original de marcacao.
  }
}

async function sendContributionEmailSafely({
  requestUrl,
  context,
  season,
  config,
  contribution,
  selectedSum,
  markedRows,
  indexResult
}) {
  const recipient = String(context.profile?.email || context.user?.email || '').trim();
  if (!recipient) return { sent: false, warning: 'email_usuario_indisponivel' };

  const details = indexResult?.details || {};
  const totalMarkedSquares = Number(details.marked_squares || markedRows.length || 0);
  const totalSquares = Number(details.total_squares || 0);
  const metaTotal = toNumber(details.meta_total || config?.meta_total);
  const patrimonioTotal = toNumber(details.patrimonio_total);
  const progressPct = metaTotal > 0 ? Math.round(Math.min(1, patrimonioTotal / metaTotal) * 10000) / 100 : 0;
  const mode = inferMode(config);
  const shamarUrl = new URL(`/shamar/${mode === 'individual' ? 'individual' : mode}`, getSiteOrigin(requestUrl)).toString();
  const template = shamarContributionTemplate({
    userName: profileName(context.profile, context.user),
    mode,
    amount: selectedSum || contribution.amount,
    squaresMarked: markedRows.length,
    totalMarkedSquares,
    totalSquares,
    progressPct,
    identity: indexResult?.identity_level || indexResult?.index?.identity_level || season.identity_level,
    shamarUrl
  });

  const result = await sendEmail({
    userId: context.user.id,
    to: recipient,
    subject: template.subject,
    html: template.html,
    emailType: 'shamar_contribution_registered',
    emailSnapshot: {
      source: 'shamar',
      mode,
      season_id: season.id,
      tribo_config_id: season.tribo_config_id,
      contribution_id: contribution.id,
      amount: selectedSum || toNumber(contribution.amount),
      squares_marked: markedRows.length,
      total_marked_squares: totalMarkedSquares,
      total_squares: totalSquares,
      progress_pct: progressPct,
      identity_level: indexResult?.identity_level || null,
      shamar_url: shamarUrl
    }
  });

  if (!result.success) return { sent: false, warning: result.error || 'email_send_failed' };
  return { sent: true, id: result.id || null };
}

async function listContributionRows(supabase, userId, seasonId) {
  let query = supabase
    .from('shamar_contributions')
    .select('*')
    .eq('user_id', userId)
    .order('contributed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (seasonId) query = query.eq('season_id', seasonId);

  const { data, error } = await query;
  if (error) return { contributions: [], error };
  return { contributions: data || [], error: null };
}

async function attachMarkedSquares(supabase, contributions) {
  const contributionIds = contributions.map((row) => row.id);
  if (contributionIds.length === 0) return contributions;

  const { data: markedRows, error: markedError } = await supabase
    .from('shamar_marked_squares')
    .select('id,season_id,square_id,contribution_id,marked_at')
    .in('contribution_id', contributionIds);

  if (markedError) throw markedError;

  const squareIds = [...new Set((markedRows || []).map((row) => row.square_id))];
  const { data: squares, error: squaresError } = squareIds.length > 0
    ? await supabase
        .from('shamar_board_squares')
        .select('id,position,value,category')
        .in('id', squareIds)
    : { data: [], error: null };

  if (squaresError) throw squaresError;

  const squaresById = new Map((squares || []).map((square) => [
      square.id,
      {
        ...square,
        value: toNumber(square.position || square.value)
      }
    ]));

  const markedByContribution = new Map();
  for (const row of markedRows || []) {
    const current = markedByContribution.get(row.contribution_id) || [];
    current.push({
      ...row,
      square: squaresById.get(row.square_id) || null
    });
    markedByContribution.set(row.contribution_id, current);
  }

  return contributions.map((contribution) => ({
    ...contribution,
    amount: toNumber(contribution.amount),
    marked_squares: markedByContribution.get(contribution.id) || []
  }));
}

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const seasonId = normalizeId(parsed.body?.season_id);
  const amount = normalizePositiveMoney(parsed.body?.amount);
  const contributedAt = normalizeIsoDate(parsed.body?.contributed_at);
  const observation = String(parsed.body?.observation || '').trim() || null;
  const proofUrl = String(parsed.body?.proof_url || '').trim();
  const squareIds = normalizeSquareIds(parsed.body?.square_ids);

  if (!seasonId) return NextResponse.json({ error: 'season_id_obrigatorio' }, { status: 422 });
  if (amount === null) return NextResponse.json({ error: 'amount_invalido' }, { status: 422 });
  if (!contributedAt) return NextResponse.json({ error: 'contributed_at_invalido' }, { status: 422 });
  if (!proofUrl) return NextResponse.json({ error: 'proof_url_obrigatorio' }, { status: 422 });
  if (!proofUrl.startsWith(`${context.user.id}/`)) {
    return NextResponse.json({ error: 'proof_url_deve_pertencer_ao_usuario' }, { status: 422 });
  }
  if (squareIds.length === 0) return NextResponse.json({ error: 'square_ids_obrigatorio' }, { status: 422 });

  const { season, error: seasonError } = await loadOwnedSeason(context.supabase, context.user.id, seasonId);
  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }
  if (!season) return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });
  if (season.status !== 'active') return NextResponse.json({ error: 'temporada_inativa' }, { status: 409 });

  const readSupabase = getShamarWriterSupabase(context.supabase);
  const { squares, error: squaresError } = await loadSelectedSquares(readSupabase, season.tribo_config_id, squareIds);
  if (squaresError) {
    return NextResponse.json({ error: resolveShamarDbError(squaresError, 'shamar_squares_lookup_failed') }, { status: 500 });
  }

  const configResult = await loadContributionConfig(readSupabase, season.tribo_config_id);
  const contributionConfig = configResult.config;

  if (squares.length !== squareIds.length) {
    return NextResponse.json({ error: 'quadrinhos_invalidos_para_temporada' }, { status: 422 });
  }

  const selectedSum = roundMoney(squares.reduce((sum, square) => sum + toNumber(square.value), 0));
  if (Math.abs(selectedSum - amount) > AMOUNT_TOLERANCE) {
    return NextResponse.json(
      {
        error: 'amount_nao_confere_com_quadrinhos',
        amount,
        selected_sum: selectedSum,
        diff: roundMoney(amount - selectedSum),
        tolerance: AMOUNT_TOLERANCE
      },
      { status: 422 }
    );
  }

  const { data: alreadyMarked, error: markedError } = await context.supabase
    .from('shamar_marked_squares')
    .select('square_id')
    .eq('season_id', season.id)
    .in('square_id', squareIds);

  if (markedError) {
    return NextResponse.json({ error: resolveShamarDbError(markedError, 'shamar_marked_lookup_failed') }, { status: 500 });
  }

  if ((alreadyMarked || []).length > 0) {
    return NextResponse.json(
      {
        error: 'quadrinhos_ja_marcados',
        square_ids: alreadyMarked.map((row) => row.square_id)
      },
      { status: 409 }
    );
  }

  const { count: previousContributionsCount, error: countError } = await context.supabase
    .from('shamar_contributions')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', season.id)
    .eq('user_id', context.user.id);

  if (countError) {
    return NextResponse.json({ error: resolveShamarDbError(countError, 'shamar_contribution_count_failed') }, { status: 500 });
  }

  const { data: contribution, error: contributionError } = await context.supabase
    .from('shamar_contributions')
    .insert({
      season_id: season.id,
      user_id: context.user.id,
      amount,
      contributed_at: contributedAt,
      observation,
      proof_url: proofUrl
    })
    .select('*')
    .single();

  if (contributionError || !contribution) {
    return NextResponse.json({ error: resolveShamarDbError(contributionError, 'shamar_contribution_create_failed') }, { status: 500 });
  }

  const markedRows = squareIds.map((squareId) => ({
    season_id: season.id,
    square_id: squareId,
    contribution_id: contribution.id
  }));

  const { error: insertMarkedError } = await context.supabase
    .from('shamar_marked_squares')
    .insert(markedRows);

  if (insertMarkedError) {
    await cleanupContribution(context.supabase, contribution.id);
    return NextResponse.json({ error: resolveShamarDbError(insertMarkedError, 'shamar_marked_create_failed') }, { status: 500 });
  }

  const warnings = [];
  if (configResult.error) warnings.push(resolveShamarDbError(configResult.error, 'shamar_config_lookup_failed'));
  const isFirstAporte = Number(previousContributionsCount || 0) === 0;
  let shamarPoints = null;
  let zeroCoins = null;
  let contributionEmail = null;

  if (isFirstAporte) {
    shamarPoints = await awardShamarPointsSafely({
      userId: context.user.id,
      seasonId: season.id,
      amount: 50,
      sourceType: 'first_aporte',
      sourceId: contribution.id,
      description: 'Primeiro aporte SHAMAR'
    });

    zeroCoins = await awardZeroCoinsSafely({
      userId: context.user.id,
      amount: 50,
      actionType: 'shamar_first_aporte',
      description: 'Primeiro aporte SHAMAR',
      metadata: {
        source: 'shamar',
        season_id: season.id,
        contribution_id: contribution.id
      }
    });

    if (shamarPoints.warning) warnings.push(`Pontos SHAMAR: ${shamarPoints.warning}`);
    if (zeroCoins.warning) warnings.push(`ZeroCoins: ${zeroCoins.warning}`);
  }

  let indexResult = null;
  try {
    const serviceSupabase = getServiceSupabase();
    indexResult = await calculateAndPersistShamarIndex({
      supabase: serviceSupabase,
      userId: context.user.id,
      seasonId: season.id
    });
  } catch (error) {
    warnings.push(error?.message || 'shamar_index_recalculate_failed');
  }

  try {
    contributionEmail = await sendContributionEmailSafely({
      requestUrl: request.url,
      context,
      season,
      config: contributionConfig,
      contribution,
      selectedSum,
      markedRows,
      indexResult
    });
    if (contributionEmail.warning) warnings.push(`Email: ${contributionEmail.warning}`);
  } catch (error) {
    contributionEmail = { sent: false };
    warnings.push(`Email: ${error?.message || 'shamar_contribution_email_failed'}`);
  }

  return NextResponse.json(
    {
      contribution_id: contribution.id,
      contribution: {
        ...contribution,
        amount: toNumber(contribution.amount)
      },
      squares_marked: markedRows.length,
      selected_sum: selectedSum,
      first_aporte: isFirstAporte,
      shamar_points: shamarPoints,
      zero_coins: zeroCoins,
      email: contributionEmail,
      index: indexResult?.index || null,
      new_total: indexResult?.details?.patrimonio_total ?? null,
      identity_level: indexResult?.identity_level || null,
      warnings
    },
    { status: 201 }
  );
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const seasonId = normalizeId(searchParams.get('season_id'));

  if (seasonId) {
    const { season, error: seasonError } = await loadOwnedSeason(context.supabase, context.user.id, seasonId);
    if (seasonError) {
      return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
    }
    if (!season) return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });
  }

  const { contributions, error } = await listContributionRows(context.supabase, context.user.id, seasonId);
  if (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_contributions_lookup_failed') }, { status: 500 });
  }

  try {
    const readSupabase = getShamarWriterSupabase(context.supabase);
    const enriched = await attachMarkedSquares(readSupabase, contributions);
    return NextResponse.json({
      contributions: enriched,
      total: enriched.length
    });
  } catch (attachError) {
    return NextResponse.json({ error: resolveShamarDbError(attachError, 'shamar_contribution_marks_lookup_failed') }, { status: 500 });
  }
}
