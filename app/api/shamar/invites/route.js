import { NextResponse } from 'next/server';
import { sendEmail } from '@/src/lib/email/email-service';
import { shamarInviteTemplate } from '@/src/lib/email/templates/shamar-invite';
import { awardZeroCoinsSafely } from '@/src/lib/shamar/awards';
import {
  createAuthenticatedContext,
  getShamarWriterSupabase,
  normalizeId,
  parseJsonBody,
  resolveShamarDbError,
  toNumber
} from '@/src/lib/shamar/api';

const INVITE_MODES = new Set(['dupla', 'tribo']);

function normalizeMode(value) {
  const raw = String(value || '').trim().toLowerCase();
  return INVITE_MODES.has(raw) ? raw : null;
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

function sameEmail(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function canReadInvite(invite, contextEmail, userId) {
  return invite?.inviter_user_id === userId
    || invite?.invited_user_id === userId
    || sameEmail(invite?.invited_email, contextEmail);
}

function canAcceptInvite(invite, contextEmail, userId) {
  return invite?.invited_user_id === userId || sameEmail(invite?.invited_email, contextEmail);
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

async function loadActiveModes(supabase, userId) {
  const { data: seasons, error: seasonsError } = await supabase
    .from('shamar_seasons')
    .select('id,tribo_config_id,status')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (seasonsError) return { modes: new Set(), error: seasonsError };

  const configIds = [...new Set((seasons || []).map((season) => season.tribo_config_id).filter(Boolean))];
  if (configIds.length === 0) return { modes: new Set(), error: null };

  const { data: configs, error: configsError } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma')
    .in('id', configIds);

  if (configsError) return { modes: new Set(), error: configsError };

  const configById = new Map((configs || []).map((config) => [config.id, config]));
  return {
    modes: new Set((seasons || []).map((season) => inferMode(configById.get(season.tribo_config_id)))),
    error: null
  };
}

async function fetchInviteByToken(supabase, token) {
  const { data, error } = await supabase
    .from('shamar_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) return { invite: null, error };
  return { invite: data || null, error: null };
}

async function fetchInviteById(supabase, inviteId) {
  const { data, error } = await supabase
    .from('shamar_invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle();

  if (error) return { invite: null, error };
  return { invite: data || null, error: null };
}

async function enrichInvites(supabase, invites, includeToken = false) {
  const rows = invites || [];
  const configIds = [...new Set(rows.map((invite) => invite.tribo_config_id).filter(Boolean))];
  const inviterIds = [...new Set(rows.map((invite) => invite.inviter_user_id).filter(Boolean))];

  const [configsResult, profilesResult] = await Promise.all([
    configIds.length > 0
      ? supabase
          .from('shamar_tribo_configs')
          .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active')
          .in('id', configIds)
      : { data: [], error: null },
    inviterIds.length > 0
      ? supabase
          .from('profiles')
          .select('id,email,full_name')
          .in('id', inviterIds)
      : { data: [], error: null }
  ]);

  const firstError = configsResult.error || profilesResult.error;
  if (firstError) throw firstError;

  const configById = new Map((configsResult.data || []).map((config) => [config.id, config]));
  const profileById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));

  return rows.map((invite) => {
    const config = configById.get(invite.tribo_config_id) || null;
    const inviter = profileById.get(invite.inviter_user_id) || null;

    return {
      id: invite.id,
      mode: normalizeMode(invite.mode) || inferMode(config),
      status: invite.status,
      invited_email: invite.invited_email,
      email_sent: Boolean(invite.email_sent_at),
      email_error: invite.email_error || null,
      created_at: invite.created_at,
      accepted_at: invite.accepted_at,
      token: includeToken ? invite.token : undefined,
      inviter: inviter
        ? {
            id: inviter.id,
            name: profileName(inviter),
            email: inviter.email
          }
        : null,
      config: config
        ? {
            ...config,
            meta_total: toNumber(config.meta_total),
            mode: normalizeMode(invite.mode) || inferMode(config)
          }
        : null
    };
  });
}

async function createPartnershipIfNeeded(supabase, invite, acceptedSeasonId, warnings) {
  if (invite.mode !== 'dupla') return;

  const { data: creatorSeason, error: creatorSeasonError } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status')
    .eq('tribo_config_id', invite.tribo_config_id)
    .eq('user_id', invite.inviter_user_id)
    .maybeSingle();

  if (creatorSeasonError) {
    warnings.push(resolveShamarDbError(creatorSeasonError, 'shamar_creator_season_lookup_failed'));
    return;
  }

  if (!creatorSeason) {
    warnings.push('shamar_creator_season_not_found');
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('shamar_partnerships')
    .select('id,status')
    .or(`season_id_a.eq.${creatorSeason.id},season_id_b.eq.${creatorSeason.id}`)
    .in('status', ['pending', 'active'])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    warnings.push(resolveShamarDbError(existingError, 'shamar_partnership_existing_lookup_failed'));
    return;
  }

  if (existing) return;

  const { error: partnershipError } = await supabase.from('shamar_partnerships').insert({
    season_id_a: creatorSeason.id,
    season_id_b: acceptedSeasonId,
    status: 'active'
  });

  if (partnershipError) warnings.push(resolveShamarDbError(partnershipError, 'shamar_partnership_create_failed'));
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const supabase = getShamarWriterSupabase(context.supabase);
  const { searchParams } = new URL(request.url);
  const token = normalizeId(searchParams.get('token'));
  const contextEmail = String(context.profile?.email || context.user.email || '').toLowerCase();

  try {
    if (token) {
      const { invite, error } = await fetchInviteByToken(supabase, token);
      if (error) return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_invite_lookup_failed') }, { status: 500 });
      if (!invite) return NextResponse.json({ error: 'convite_nao_encontrado' }, { status: 404 });
      if (!canReadInvite(invite, contextEmail, context.user.id)) {
        return NextResponse.json({ error: 'convite_destinado_a_outro_email' }, { status: 403 });
      }

      const [enriched] = await enrichInvites(supabase, [invite], true);
      return NextResponse.json({ invite: enriched });
    }

    const [incomingByUser, incomingByEmail, outgoing] = await Promise.all([
      supabase
        .from('shamar_invites')
        .select('*')
        .eq('invited_user_id', context.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('shamar_invites')
        .select('*')
        .ilike('invited_email', contextEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('shamar_invites')
        .select('*')
        .eq('inviter_user_id', context.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const firstError = incomingByUser.error || incomingByEmail.error || outgoing.error;
    if (firstError) {
      return NextResponse.json({ error: resolveShamarDbError(firstError, 'shamar_invites_lookup_failed') }, { status: 500 });
    }

    const incomingMap = new Map();
    for (const row of [...(incomingByUser.data || []), ...(incomingByEmail.data || [])]) {
      incomingMap.set(row.id, row);
    }

    const [incoming, outgoingRows] = await Promise.all([
      enrichInvites(supabase, [...incomingMap.values()], true),
      enrichInvites(supabase, outgoing.data || [], true)
    ]);

    return NextResponse.json({ incoming, outgoing: outgoingRows });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_invites_lookup_failed') }, { status: 500 });
  }
}

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const token = normalizeId(parsed.body?.token);
  const inviteId = normalizeId(parsed.body?.invite_id);
  const action = String(parsed.body?.action || 'accept').trim().toLowerCase();
  if (!token && !inviteId) return NextResponse.json({ error: 'convite_obrigatorio' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);
  const contextEmail = String(context.profile?.email || context.user.email || '').toLowerCase();
  const warnings = [];

  const inviteResult = token
    ? await fetchInviteByToken(supabase, token)
    : await fetchInviteById(supabase, inviteId);

  if (inviteResult.error) {
    return NextResponse.json({ error: resolveShamarDbError(inviteResult.error, 'shamar_invite_lookup_failed') }, { status: 500 });
  }

  const invite = inviteResult.invite;
  if (!invite) return NextResponse.json({ error: 'convite_nao_encontrado' }, { status: 404 });

  if (action === 'resend') {
    if (invite.inviter_user_id !== context.user.id) {
      return NextResponse.json({ error: 'convite_nao_pertence_ao_usuario' }, { status: 403 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'convite_nao_esta_pendente', status: invite.status }, { status: 409 });
    }

    const acceptUrl = new URL(`/shamar/convites?token=${encodeURIComponent(invite.token)}`, getSiteOrigin(request.url)).toString();
    const template = shamarInviteTemplate({
      inviterName: profileName(context.profile),
      mode: invite.mode,
      acceptUrl
    });

    const emailResult = await sendEmail({
      userId: context.user.id,
      to: invite.invited_email,
      subject: template.subject,
      html: template.html,
      emailType: 'shamar_invite_resend',
      emailSnapshot: {
        mode: invite.mode,
        invite_id: invite.id,
        tribo_config_id: invite.tribo_config_id,
        accept_url: acceptUrl,
        resend: true
      }
    });

    const emailPatch = emailResult.success
      ? { email_sent_at: new Date().toISOString(), email_error: null, updated_at: new Date().toISOString() }
      : { email_error: emailResult.error || 'email_send_failed', updated_at: new Date().toISOString() };

    const { data: updatedInvite, error: updateError } = await supabase
      .from('shamar_invites')
      .update(emailPatch)
      .eq('id', invite.id)
      .select('id,invited_email,mode,status,email_sent_at,email_error')
      .single();

    if (updateError) {
      return NextResponse.json({ error: resolveShamarDbError(updateError, 'shamar_invite_email_status_update_failed') }, { status: 500 });
    }

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: emailResult.error || 'email_send_failed',
          invite: {
            id: updatedInvite?.id || invite.id,
            email: updatedInvite?.invited_email || invite.invited_email,
            status: updatedInvite?.status || invite.status,
            email_sent: Boolean(updatedInvite?.email_sent_at),
            email_error: updatedInvite?.email_error || emailResult.error || 'email_send_failed'
          }
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      invite: {
        id: updatedInvite.id,
        email: updatedInvite.invited_email,
        status: updatedInvite.status,
        email_sent: Boolean(updatedInvite.email_sent_at),
        email_error: updatedInvite.email_error || null
      }
    });
  }

  if (!canAcceptInvite(invite, contextEmail, context.user.id)) {
    return NextResponse.json({ error: 'convite_destinado_a_outro_email' }, { status: 403 });
  }
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'convite_nao_esta_pendente', status: invite.status }, { status: 409 });
  }

  const mode = normalizeMode(invite.mode);
  if (!mode) return NextResponse.json({ error: 'modo_shamar_invalido' }, { status: 422 });

  const { data: config, error: configError } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active')
    .eq('id', invite.tribo_config_id)
    .maybeSingle();

  if (configError) {
    return NextResponse.json({ error: resolveShamarDbError(configError, 'shamar_config_lookup_failed') }, { status: 500 });
  }
  if (!config || !config.is_active) return NextResponse.json({ error: 'config_nao_encontrada' }, { status: 404 });

  const activeModes = await loadActiveModes(supabase, context.user.id);
  if (activeModes.error) {
    return NextResponse.json({ error: resolveShamarDbError(activeModes.error, 'shamar_existing_modes_lookup_failed') }, { status: 500 });
  }
  if (activeModes.modes.has(mode)) {
    return NextResponse.json({ error: 'modalidade_shamar_ja_criada', mode }, { status: 409 });
  }

  const { data: existingSeason, error: existingSeasonError } = await supabase
    .from('shamar_seasons')
    .select('id,status')
    .eq('user_id', context.user.id)
    .eq('tribo_config_id', invite.tribo_config_id)
    .maybeSingle();

  if (existingSeasonError) {
    return NextResponse.json({ error: resolveShamarDbError(existingSeasonError, 'shamar_existing_season_lookup_failed') }, { status: 500 });
  }
  if (existingSeason) {
    return NextResponse.json({ error: 'temporada_ja_existe', season_id: existingSeason.id, status: existingSeason.status }, { status: 409 });
  }

  const { data: season, error: seasonError } = await supabase
    .from('shamar_seasons')
    .insert({
      user_id: context.user.id,
      tribo_config_id: invite.tribo_config_id,
      patrimonio_inicial: 0
    })
    .select('*')
    .single();

  if (seasonError || !season) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_create_failed') }, { status: 500 });
  }

  warnings.push(...await initializeSeasonArtifacts(supabase, context.user.id, season.id));
  await createPartnershipIfNeeded(supabase, invite, season.id, warnings);

  const { data: updatedInvite, error: updateError } = await supabase
    .from('shamar_invites')
    .update({
      status: 'accepted',
      invited_user_id: context.user.id,
      accepted_by_user_id: context.user.id,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', invite.id)
    .select('*')
    .single();

  if (updateError) warnings.push(resolveShamarDbError(updateError, 'shamar_invite_accept_update_failed'));

  const zeroCoins = await awardZeroCoinsSafely({
    userId: context.user.id,
    amount: 50,
    actionType: 'shamar_invite_accepted',
    description: 'Convite SHAMAR aceito',
    metadata: {
      source: 'shamar',
      mode,
      season_id: season.id,
      tribo_config_id: invite.tribo_config_id,
      invite_id: invite.id
    }
  });

  if (zeroCoins.warning) warnings.push(`ZeroCoins: ${zeroCoins.warning}`);

  return NextResponse.json({
    mode,
    invite: updatedInvite
      ? {
          id: updatedInvite.id,
          status: updatedInvite.status,
          accepted_at: updatedInvite.accepted_at
        }
      : {
          id: invite.id,
          status: 'accepted'
        },
    season_id: season.id,
    tribo_config_id: invite.tribo_config_id,
    config: {
      ...config,
      meta_total: toNumber(config.meta_total),
      mode
    },
    zero_coins_awarded: zeroCoins.awarded,
    zero_coins_balance: zeroCoins.balance,
    warnings
  });
}
