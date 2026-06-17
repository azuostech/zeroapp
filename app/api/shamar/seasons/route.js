import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { sendEmail } from '@/src/lib/email/email-service';
import { shamarInviteTemplate } from '@/src/lib/email/templates/shamar-invite';
import { awardZeroCoinsSafely } from '@/src/lib/shamar/awards';
import {
  canAccessShamarConfig,
  createAuthenticatedContext,
  getShamarWriterSupabase,
  loadShamarProfile,
  normalizeId,
  normalizeIsoDate,
  normalizeMoney,
  parseJsonBody,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';
import { generateBoard, getBoardStats, getSequentialMetaTotal, validateBoard } from '@/src/lib/shamar/board-generator';

const ALLOWED_DURATIONS = new Set([30, 90, 180, 365]);
const SELF_SERVICE_MODES = new Set(['individual', 'dupla', 'tribo']);

function normalizeMode(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'eu') return 'individual';
  if (raw === 'nos' || raw === 'nós') return 'dupla';
  return SELF_SERVICE_MODES.has(raw) ? raw : null;
}

function inferMode(config) {
  const turma = String(config?.turma || '').toLowerCase();
  if (turma.includes('dupla')) return 'dupla';
  if (turma.includes('tribo')) return 'tribo';
  return 'individual';
}

function profileName(profile) {
  const name = String(profile?.full_name || '').trim();
  if (name) return name.split(/\s+/).slice(0, 2).join(' ');
  const email = String(profile?.email || '').trim();
  return email.includes('@') ? email.split('@')[0] : 'Guardiao';
}

function normalizeEmailList(value) {
  const rows = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/);
  return [...new Set(
    rows
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
  )];
}

function modePrefix(mode) {
  if (mode === 'dupla') return 'SHAMAR Dupla';
  if (mode === 'tribo') return 'SHAMAR Tribo';
  return 'SHAMAR Individual';
}

function buildSelfServiceTurma(mode, name, profile) {
  const suffix = String(name || '').trim() || profileName(profile);
  return `${modePrefix(mode)} · ${suffix}`;
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

function inviteToken() {
  return randomBytes(24).toString('hex');
}

async function findProfilesByEmails(supabase, emails) {
  const profiles = [];

  for (const email of emails) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,status,tier,turma,shamar_unlocked')
      .ilike('email', email)
      .maybeSingle();

    if (error) return { profiles: [], missing: [], inactive: [], error };
    if (data) profiles.push(data);
  }

  const foundEmails = new Set(profiles.map((profile) => String(profile.email || '').toLowerCase()));
  const missing = emails.filter((email) => !foundEmails.has(email));
  const inactive = profiles.filter((profile) => profile.status !== 'active');

  return { profiles, missing, inactive, error: null };
}

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
      .select('id,position,value')
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
  const sumTotal = roundMoney(squares.reduce((sum, row) => sum + toNumber(row.position || row.value), 0));

  const effectiveMetaTotal = sumTotal > 0 ? sumTotal : toNumber(config.meta_total);

  return {
    contributions_count: contributions.length,
    contributions_total: totalContributed,
    squares_total: squares.length,
    squares_marked: (markedResult.data || []).length,
    squares_available: Math.max(0, squares.length - (markedResult.data || []).length),
    sum_total: sumTotal,
    sum_marked: totalContributed,
    meta_total: effectiveMetaTotal,
    progress_pct: effectiveMetaTotal > 0
      ? Math.round(Math.min(1, totalContributed / effectiveMetaTotal) * 10000) / 100
      : 0,
    shamar_points_total: toNumber(pointsResult.data?.points_total),
    current_index: latestIndexResult.data || null
  };
}

async function loadActiveSeasonsWithConfigs(supabase, userId) {
  const { data: seasons, error: seasonsError } = await supabase
    .from('shamar_seasons')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false });

  if (seasonsError) return { seasons: [], error: seasonsError };

  const rows = seasons || [];
  const configIds = [...new Set(rows.map((season) => season.tribo_config_id).filter(Boolean))];

  if (configIds.length === 0) return { seasons: [], error: null };

  const { data: configs, error: configsError } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active')
    .in('id', configIds);

  if (configsError) return { seasons: [], error: configsError };

  const configsById = new Map((configs || []).map((config) => [
    config.id,
    {
      ...config,
      meta_total: toNumber(config.meta_total),
      mode: inferMode(config)
    }
  ]));

  return {
    seasons: rows.map((season) => {
      const config = configsById.get(season.tribo_config_id) || null;
      return {
        ...season,
        mode: inferMode(config),
        config
      };
    }),
    error: null
  };
}

async function initializeSeasonArtifacts(supabase, userId, seasonId) {
  const warnings = [];

  const { error: balanceError } = await supabase
    .from('shamar_points_balance')
    .upsert(
      {
        user_id: userId,
        season_id: seasonId,
        points_total: 0,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,season_id' }
    );

  if (balanceError) warnings.push(resolveShamarDbError(balanceError, 'shamar_points_balance_create_failed'));

  const { error: indexError } = await supabase.from('shamar_index_history').upsert(
    {
      user_id: userId,
      season_id: seasonId,
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
  return warnings;
}

async function createSelfServiceSeason({ context, profile, body, requestUrl }) {
  const mode = normalizeMode(body?.mode);
  if (!mode) return NextResponse.json({ error: 'modo_shamar_invalido' }, { status: 422 });

  const requestedMetaTotal = normalizeMoney(body?.meta_total ?? 125000);
  const durationDays = Number(body?.duration_days || 180);
  const startedAt = normalizeIsoDate(body?.started_at || new Date().toISOString().slice(0, 10));
  const patrimonioInicial = body?.patrimonio_inicial === undefined ? 0 : normalizeMoney(body?.patrimonio_inicial);
  const invitedEmails = normalizeEmailList(body?.invite_emails ?? body?.invites ?? body?.emails);

  if (requestedMetaTotal === null || requestedMetaTotal <= 0) return NextResponse.json({ error: 'meta_total_invalida' }, { status: 422 });
  if (!ALLOWED_DURATIONS.has(durationDays)) return NextResponse.json({ error: 'duration_days_invalido' }, { status: 422 });
  if (!startedAt) return NextResponse.json({ error: 'started_at_invalido' }, { status: 422 });
  if (patrimonioInicial === null || patrimonioInicial < 0) {
    return NextResponse.json({ error: 'patrimonio_inicial_invalido' }, { status: 422 });
  }
  if (mode === 'dupla' && invitedEmails.length !== 1) {
    return NextResponse.json({ error: 'dupla_exige_um_convite' }, { status: 422 });
  }
  if (mode === 'tribo' && invitedEmails.length < 2) {
    return NextResponse.json({ error: 'tribo_exige_minimo_tres_participantes' }, { status: 422 });
  }

  const supabase = getShamarWriterSupabase(context.supabase);
  const existingResult = await loadActiveSeasonsWithConfigs(supabase, context.user.id);
  if (existingResult.error) {
    return NextResponse.json({ error: resolveShamarDbError(existingResult.error, 'shamar_existing_modes_lookup_failed') }, { status: 500 });
  }
  const existingMode = (existingResult.seasons || []).find((season) => (season.mode || season.config?.mode) === mode);
  if (existingMode) {
    return NextResponse.json(
      {
        error: 'modalidade_shamar_ja_criada',
        mode,
        season_id: existingMode.id
      },
      { status: 409 }
    );
  }

  const currentEmail = String(profile?.email || context.user.email || '').toLowerCase();
  if (invitedEmails.includes(currentEmail)) {
    return NextResponse.json({ error: 'convite_para_si_mesmo_invalido' }, { status: 422 });
  }

  const inviteResult = await findProfilesByEmails(supabase, invitedEmails);
  if (inviteResult.error) {
    return NextResponse.json({ error: resolveShamarDbError(inviteResult.error, 'profiles_invite_lookup_failed') }, { status: 500 });
  }

  const metaTotal = getSequentialMetaTotal(requestedMetaTotal);
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

  const turma = buildSelfServiceTurma(mode, body?.name, profile);
  const { data: config, error: configError } = await supabase
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

  if (configError || !config) {
    return NextResponse.json({ error: resolveShamarDbError(configError, 'shamar_config_create_failed') }, { status: 500 });
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

  const { data: currentSeason, error: seasonsError } = await supabase
    .from('shamar_seasons')
    .insert({
      user_id: context.user.id,
      tribo_config_id: config.id,
      patrimonio_inicial: patrimonioInicial
    })
    .select('*')
    .single();

  if (seasonsError || !currentSeason) {
    await supabase.from('shamar_tribo_configs').delete().eq('id', config.id);
    return NextResponse.json({ error: resolveShamarDbError(seasonsError, 'shamar_season_create_failed') }, { status: 500 });
  }

  const warnings = [];
  warnings.push(...await initializeSeasonArtifacts(supabase, context.user.id, currentSeason.id));

  const profilesByEmail = new Map(
    (inviteResult.profiles || []).map((item) => [String(item.email || '').toLowerCase(), item])
  );
  const origin = getSiteOrigin(requestUrl);
  const inviteRows = invitedEmails.map((email) => ({
    tribo_config_id: config.id,
    inviter_user_id: context.user.id,
    invited_user_id: profilesByEmail.get(email)?.id || null,
    invited_email: email,
    mode,
    token: inviteToken()
  }));

  let invites = [];
  if (inviteRows.length > 0) {
    const { data: insertedInvites, error: inviteError } = await supabase
      .from('shamar_invites')
      .insert(inviteRows)
      .select('id,invited_email,mode,status,token,email_sent_at,email_error');

    if (inviteError) {
      await supabase.from('shamar_tribo_configs').delete().eq('id', config.id);
      return NextResponse.json({ error: resolveShamarDbError(inviteError, 'shamar_invites_create_failed') }, { status: 500 });
    }

    invites = insertedInvites || [];
    const inviterName = profileName(profile);

    for (const invite of invites) {
      const acceptUrl = new URL(`/shamar/convites?token=${encodeURIComponent(invite.token)}`, origin).toString();
      const template = shamarInviteTemplate({ inviterName, mode, acceptUrl });
      const emailResult = await sendEmail({
        userId: context.user.id,
        to: invite.invited_email,
        subject: template.subject,
        html: template.html,
        emailType: 'shamar_invite',
        emailSnapshot: {
          mode,
          invite_id: invite.id,
          tribo_config_id: config.id,
          accept_url: acceptUrl
        }
      });

      const emailPatch = emailResult.success
        ? { email_sent_at: new Date().toISOString(), email_error: null }
        : { email_error: emailResult.error || 'email_send_failed' };

      const { data: updatedInvite, error: emailUpdateError } = await supabase
        .from('shamar_invites')
        .update(emailPatch)
        .eq('id', invite.id)
        .select('id,invited_email,mode,status,email_sent_at,email_error')
        .single();

      if (emailUpdateError) warnings.push(resolveShamarDbError(emailUpdateError, 'shamar_invite_email_status_update_failed'));
      if (!emailResult.success) warnings.push(`Email ${invite.invited_email}: ${emailResult.error || 'email_send_failed'}`);
      Object.assign(invite, updatedInvite || emailPatch);
      delete invite.token;
    }
  }

  const zeroCoins = await awardZeroCoinsSafely({
    userId: context.user.id,
    amount: 50,
    actionType: 'shamar_season_started',
    description: 'Temporada SHAMAR iniciada',
    metadata: {
      source: 'shamar',
      mode,
      requested_meta_total: requestedMetaTotal,
      season_id: currentSeason.id,
      tribo_config_id: config.id
    }
  });

  if (zeroCoins.warning) warnings.push(`ZeroCoins: ${zeroCoins.warning}`);

  return NextResponse.json(
    {
      mode,
      season_id: currentSeason.id,
      tribo_config_id: config.id,
      started_at: currentSeason.started_at,
      config: {
        ...config,
        meta_total: toNumber(config.meta_total),
        mode,
        board_stats: getBoardStats(squares)
      },
      participants: [
        {
          email: currentEmail,
          current_user: true,
          season_id: currentSeason.id
        }
      ],
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.invited_email,
        status: invite.status,
        email_sent: Boolean(invite.email_sent_at),
        email_error: invite.email_error || null
      })),
      zero_coins_awarded: zeroCoins.awarded,
      zero_coins_balance: zeroCoins.balance,
      validation,
      warnings
    },
    { status: 201 }
  );
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const shamarProfileResult = await loadShamarProfile(context.supabase, context.user.id);
  if (shamarProfileResult.error) {
    return NextResponse.json({ error: shamarProfileResult.error }, { status: 500 });
  }

  const dataSupabase = getShamarWriterSupabase(context.supabase);
  const { searchParams } = new URL(request.url);
  const requestedMode = normalizeMode(searchParams.get('mode'));
  const { seasons, error: seasonsError } = await loadActiveSeasonsWithConfigs(dataSupabase, context.user.id);
  if (seasonsError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonsError, 'shamar_seasons_lookup_failed') }, { status: 500 });
  }

  const season = requestedMode
    ? (seasons || []).find((item) => (item.mode || item.config?.mode) === requestedMode) || null
    : seasons[0] || null;

  if (!season) {
    return NextResponse.json({
      season: null,
      seasons: [],
      config: null,
      progress: null,
      index: null,
      profile: {
        turma: shamarProfileResult.profile?.turma || null,
        tier: shamarProfileResult.profile?.tier || null,
        shamar_unlocked: Boolean(shamarProfileResult.profile?.shamar_unlocked)
      },
      locked: false
    });
  }

  const { config, error: configError } = await loadConfig(dataSupabase, season.tribo_config_id);
  if (configError) {
    return NextResponse.json({ error: resolveShamarDbError(configError, 'shamar_config_lookup_failed') }, { status: 500 });
  }
  if (!config) {
    return NextResponse.json({ error: 'config_nao_encontrada' }, { status: 404 });
  }

  try {
    const enrichedConfig = { ...config, meta_total: toNumber(config.meta_total), mode: inferMode(config) };
    const progress = await loadSeasonProgress(dataSupabase, season, enrichedConfig);
    const effectiveConfig = {
      ...enrichedConfig,
      meta_total: progress.meta_total || enrichedConfig.meta_total
    };
    return NextResponse.json({
      season: {
        ...season,
        config: effectiveConfig
      },
      seasons,
      config: effectiveConfig,
      index: progress.current_index,
      profile: {
        turma: shamarProfileResult.profile?.turma || null,
        tier: shamarProfileResult.profile?.tier || null,
        shamar_unlocked: Boolean(shamarProfileResult.profile?.shamar_unlocked)
      },
      locked: false,
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
  const requestedMode = normalizeMode(parsed.body?.mode);
  const patrimonioInicial = parsed.body?.patrimonio_inicial === undefined
    ? 0
    : normalizeMoney(parsed.body?.patrimonio_inicial);

  const shamarProfileResult = await loadShamarProfile(context.supabase, context.user.id);
  if (shamarProfileResult.error) {
    return NextResponse.json({ error: shamarProfileResult.error }, { status: 500 });
  }

  if (!triboConfigId && requestedMode) {
    return createSelfServiceSeason({
      context,
      profile: shamarProfileResult.profile,
      body: parsed.body,
      requestUrl: request.url
    });
  }

  if (!triboConfigId) {
    return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });
  }

  if (patrimonioInicial === null || patrimonioInicial < 0) {
    return NextResponse.json({ error: 'patrimonio_inicial_invalido' }, { status: 422 });
  }

  const dataSupabase = getShamarWriterSupabase(context.supabase);
  const { config, error: configError } = await loadConfig(dataSupabase, triboConfigId);
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

  const { data: season, error: insertError } = await dataSupabase
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

  const { error: balanceError } = await dataSupabase
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
