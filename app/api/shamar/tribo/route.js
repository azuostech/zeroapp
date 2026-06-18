import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { sendEmail } from '@/src/lib/email/email-service';
import { shamarInviteTemplate } from '@/src/lib/email/templates/shamar-invite';
import {
  createAuthenticatedContext,
  getShamarWriterSupabase,
  normalizeId,
  parseJsonBody,
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

function normalizeEmailList(value) {
  const rows = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/);
  return [...new Set(
    rows
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
  )];
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
      .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by')
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
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by')
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

async function loadManageableConfig(supabase, context, configId) {
  const { data: config, error } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by')
    .eq('id', configId)
    .maybeSingle();

  if (error) return { config: null, error, forbidden: false };
  if (!config) return { config: null, error: null, forbidden: false };

  const isAdmin = context.profile?.role === 'admin' || context.profile?.is_admin === true;
  const isCreator = config.created_by === context.user.id;
  return { config, error: null, forbidden: !isAdmin && !isCreator, isAdmin, isCreator };
}

async function findProfilesByEmails(supabase, emails) {
  const profiles = [];

  for (const email of emails) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name')
      .ilike('email', email)
      .maybeSingle();

    if (error) return { profiles: [], error };
    if (data) profiles.push(data);
  }

  return { profiles, error: null };
}

async function loadParticipantEmails(supabase, configId) {
  const { data: seasons, error: seasonsError } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,status')
    .eq('tribo_config_id', configId)
    .eq('status', 'active');

  if (seasonsError) return { emails: new Set(), seasons: [], error: seasonsError };

  const rows = seasons || [];
  const userIds = [...new Set(rows.map((season) => season.user_id).filter(Boolean))];
  if (userIds.length === 0) return { emails: new Set(), seasons: rows, error: null };

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,email')
    .in('id', userIds);

  if (profilesError) return { emails: new Set(), seasons: rows, error: profilesError };

  return {
    emails: new Set((profiles || []).map((profile) => String(profile.email || '').toLowerCase()).filter(Boolean)),
    seasons: rows,
    error: null
  };
}

async function createTriboInvites({ supabase, context, config, requestUrl, emails }) {
  const normalizedEmails = normalizeEmailList(emails);
  if (normalizedEmails.length === 0) {
    return NextResponse.json({ error: 'emails_obrigatorios' }, { status: 422 });
  }

  const creatorId = config.created_by || context.user.id;
  const participantEmails = await loadParticipantEmails(supabase, config.id);
  if (participantEmails.error) throw participantEmails.error;

  const { data: pendingInvites, error: pendingError } = await supabase
    .from('shamar_invites')
    .select('id,invited_email,status')
    .eq('tribo_config_id', config.id)
    .eq('status', 'pending');

  if (pendingError) throw pendingError;

  const pendingEmails = new Set((pendingInvites || []).map((invite) => String(invite.invited_email || '').toLowerCase()));
  const contextEmail = String(context.profile?.email || context.user.email || '').toLowerCase();
  const eligibleEmails = normalizedEmails.filter((email) => (
    email !== contextEmail &&
    !participantEmails.emails.has(email) &&
    !pendingEmails.has(email)
  ));

  if (eligibleEmails.length === 0) {
    return NextResponse.json({ error: 'nenhum_email_elegivel_para_convite' }, { status: 409 });
  }

  const profilesResult = await findProfilesByEmails(supabase, eligibleEmails);
  if (profilesResult.error) throw profilesResult.error;
  const profilesByEmail = new Map((profilesResult.profiles || []).map((profile) => [String(profile.email || '').toLowerCase(), profile]));

  const inviteRows = eligibleEmails.map((email) => ({
    tribo_config_id: config.id,
    inviter_user_id: creatorId,
    invited_user_id: profilesByEmail.get(email)?.id || null,
    invited_email: email,
    mode: 'tribo',
    token: inviteToken()
  }));

  const { data: insertedInvites, error: inviteError } = await supabase
    .from('shamar_invites')
    .insert(inviteRows)
    .select('id,invited_email,mode,status,token,email_sent_at,email_error');

  if (inviteError) throw inviteError;

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('id,email,full_name')
    .eq('id', creatorId)
    .maybeSingle();

  const origin = getSiteOrigin(requestUrl);
  const warnings = [];
  const invites = [];

  for (const invite of insertedInvites || []) {
    const acceptUrl = new URL(`/shamar/convites?token=${encodeURIComponent(invite.token)}`, origin).toString();
    const template = shamarInviteTemplate({
      inviterName: displayName(inviterProfile || context.profile),
      mode: 'tribo',
      acceptUrl
    });

    const emailResult = await sendEmail({
      userId: creatorId,
      to: invite.invited_email,
      subject: template.subject,
      html: template.html,
      emailType: 'shamar_invite',
      emailSnapshot: {
        mode: 'tribo',
        invite_id: invite.id,
        tribo_config_id: config.id,
        accept_url: acceptUrl,
        managed_by_user_id: context.user.id
      }
    });

    const emailPatch = emailResult.success
      ? { email_sent_at: new Date().toISOString(), email_error: null, updated_at: new Date().toISOString() }
      : { email_error: emailResult.error || 'email_send_failed', updated_at: new Date().toISOString() };

    const { data: updatedInvite, error: emailUpdateError } = await supabase
      .from('shamar_invites')
      .update(emailPatch)
      .eq('id', invite.id)
      .select('id,invited_email,mode,status,token,email_sent_at,email_error')
      .single();

    if (emailUpdateError) warnings.push(resolveShamarDbError(emailUpdateError, 'shamar_invite_email_status_update_failed'));
    if (!emailResult.success) warnings.push(`Email ${invite.invited_email}: ${emailResult.error || 'email_send_failed'}`);

    const row = updatedInvite || { ...invite, ...emailPatch };
    invites.push({
      id: row.id,
      invited_email: row.invited_email,
      status: row.status,
      email_sent: Boolean(row.email_sent_at),
      email_error: row.email_error || null,
      accept_url: new URL(`/shamar/convites?token=${encodeURIComponent(row.token || invite.token)}`, origin).toString()
    });
  }

  return NextResponse.json({
    invited: invites,
    skipped: normalizedEmails.filter((email) => !eligibleEmails.includes(email)),
    warnings
  }, { status: 201 });
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const requestedConfigId = normalizeId(searchParams.get('tribo_config_id'));
  const dataSupabase = getShamarWriterSupabase(context.supabase);
  const { season, config, error } = await resolveSeasonAndConfig(dataSupabase, context.user.id, requestedConfigId);

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
      .eq('tribo_config_id', config.id)
      .eq('status', 'active');

    if (seasonsError) throw seasonsError;

    const seasonIds = (seasons || []).map((item) => item.id);
    const userIds = [...new Set((seasons || []).map((item) => item.user_id))];

    const [profilesResult, contributionsResult, markedResult, indexesResult, boardResult, invitesResult] = await Promise.all([
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
        : { data: [], error: null },
      serviceSupabase
        .from('shamar_board_squares')
        .select('position,value')
        .eq('tribo_config_id', config.id),
      serviceSupabase
        .from('shamar_invites')
        .select('id,inviter_user_id,invited_email,mode,status,token,email_sent_at,email_error,accepted_at,created_at')
        .eq('tribo_config_id', config.id)
        .order('created_at', { ascending: false })
    ]);

    const firstError = [
      profilesResult.error,
      contributionsResult.error,
      markedResult.error,
      indexesResult.error,
      boardResult.error,
      invitesResult.error
    ].find(Boolean);
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

    const participants = (seasons || []).map((item) => {
      const profile = profilesById.get(item.user_id);
      return {
        season_id: item.id,
        user_id: item.user_id,
        name: displayName(profile),
        email: profile?.email || null,
        avatar: avatarInitial(profile),
        current_user: item.user_id === context.user.id,
        is_creator: item.user_id === config.created_by,
        status: item.status,
        started_at: item.started_at
      };
    });

    const totalPatrimonio = roundMoney(contributions.reduce((sum, row) => sum + toNumber(row.amount), 0));
    const individualMetaTotal = roundMoney((boardResult.data || []).reduce((sum, row) => sum + toNumber(row.position || row.value), 0)) || toNumber(config.meta_total);
    const metaTotal = roundMoney(individualMetaTotal * Math.max(1, (seasons || []).length));
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
      permissions: {
        can_manage: config.created_by === context.user.id || context.profile?.role === 'admin' || context.profile?.is_admin === true,
        creator_user_id: config.created_by || null
      },
      participants,
      pending_invites: (invitesResult.data || [])
        .filter((invite) => invite.status === 'pending')
        .map((invite) => ({
          id: invite.id,
          invited_email: invite.invited_email,
          status: invite.status,
          email_sent: Boolean(invite.email_sent_at),
          email_error: invite.email_error || null,
          created_at: invite.created_at,
          accept_url: new URL(`/shamar/convites?token=${encodeURIComponent(invite.token)}`, getSiteOrigin(request.url)).toString()
        })),
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

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const action = String(parsed.body?.action || 'invite').trim().toLowerCase();
  const configId = normalizeId(parsed.body?.tribo_config_id);
  if (!configId) return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const manageable = await loadManageableConfig(supabase, context, configId);
    if (manageable.error) throw manageable.error;
    if (!manageable.config) return NextResponse.json({ error: 'tribo_nao_encontrada' }, { status: 404 });
    if (manageable.forbidden) return NextResponse.json({ error: 'sem_permissao_para_gerenciar_tribo' }, { status: 403 });

    if (action === 'invite') {
      return createTriboInvites({
        supabase,
        context,
        config: manageable.config,
        requestUrl: request.url,
        emails: parsed.body?.invite_emails ?? parsed.body?.emails
      });
    }

    return NextResponse.json({ error: 'acao_invalida' }, { status: 422 });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_tribo_manage_failed') }, { status: 500 });
  }
}

export async function PATCH(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const configId = normalizeId(parsed.body?.tribo_config_id);
  const turma = parsed.body?.turma === undefined ? undefined : String(parsed.body.turma || '').trim();
  if (!configId) return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });
  if (turma !== undefined && !turma) return NextResponse.json({ error: 'turma_obrigatoria' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const manageable = await loadManageableConfig(supabase, context, configId);
    if (manageable.error) throw manageable.error;
    if (!manageable.config) return NextResponse.json({ error: 'tribo_nao_encontrada' }, { status: 404 });
    if (manageable.forbidden) return NextResponse.json({ error: 'sem_permissao_para_gerenciar_tribo' }, { status: 403 });

    const patch = {};
    if (turma !== undefined) patch.turma = turma;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ config: manageable.config });
    }

    const { data: updatedConfig, error: updateError } = await supabase
      .from('shamar_tribo_configs')
      .update(patch)
      .eq('id', configId)
      .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by')
      .single();

    if (updateError) throw updateError;
    return NextResponse.json({ config: updatedConfig });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_tribo_update_failed') }, { status: 500 });
  }
}

export async function DELETE(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const action = String(parsed.body?.action || '').trim().toLowerCase();
  const configId = normalizeId(parsed.body?.tribo_config_id);
  if (!configId) return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const manageable = await loadManageableConfig(supabase, context, configId);
    if (manageable.error) throw manageable.error;
    if (!manageable.config) return NextResponse.json({ error: 'tribo_nao_encontrada' }, { status: 404 });
    if (manageable.forbidden) return NextResponse.json({ error: 'sem_permissao_para_gerenciar_tribo' }, { status: 403 });

    if (action === 'remove_participant') {
      const seasonId = normalizeId(parsed.body?.season_id);
      if (!seasonId) return NextResponse.json({ error: 'season_id_obrigatorio' }, { status: 422 });

      const { data: targetSeason, error: seasonError } = await supabase
        .from('shamar_seasons')
        .select('id,user_id,tribo_config_id,status')
        .eq('id', seasonId)
        .eq('tribo_config_id', configId)
        .maybeSingle();

      if (seasonError) throw seasonError;
      if (!targetSeason) return NextResponse.json({ error: 'participante_nao_encontrado' }, { status: 404 });
      if (targetSeason.user_id === manageable.config.created_by) {
        return NextResponse.json({ error: 'criador_nao_pode_ser_removido_da_tribo' }, { status: 409 });
      }

      const { error: updateError } = await supabase
        .from('shamar_seasons')
        .update({ status: 'abandoned', ended_at: new Date().toISOString() })
        .eq('id', seasonId)
        .eq('tribo_config_id', configId);

      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, removed_season_id: seasonId });
    }

    if (action === 'cancel_invite') {
      const inviteId = normalizeId(parsed.body?.invite_id);
      if (!inviteId) return NextResponse.json({ error: 'invite_id_obrigatorio' }, { status: 422 });

      const { error: updateError } = await supabase
        .from('shamar_invites')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', inviteId)
        .eq('tribo_config_id', configId)
        .eq('status', 'pending');

      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, cancelled_invite_id: inviteId });
    }

    if (action === 'close_tribe') {
      const now = new Date().toISOString();

      const { error: seasonsError } = await supabase
        .from('shamar_seasons')
        .update({ status: 'abandoned', ended_at: now })
        .eq('tribo_config_id', configId)
        .eq('status', 'active');

      if (seasonsError) throw seasonsError;

      const { error: configError } = await supabase
        .from('shamar_tribo_configs')
        .update({ is_active: false })
        .eq('id', configId);

      if (configError) throw configError;

      const { error: inviteError } = await supabase
        .from('shamar_invites')
        .update({ status: 'cancelled', updated_at: now })
        .eq('tribo_config_id', configId)
        .eq('status', 'pending');

      if (inviteError) throw inviteError;
      return NextResponse.json({ ok: true, closed_tribo_config_id: configId });
    }

    return NextResponse.json({ error: 'acao_invalida' }, { status: 422 });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_tribo_delete_failed') }, { status: 500 });
  }
}
