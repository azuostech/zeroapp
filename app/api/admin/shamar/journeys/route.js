import { NextResponse } from 'next/server';
import { sendEmail } from '@/src/lib/email/email-service';
import { shamarInviteTemplate } from '@/src/lib/email/templates/shamar-invite';
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
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

const ALLOWED_STATUS = new Set(['active', 'completed', 'abandoned']);
const ALLOWED_DURATIONS = new Set([30, 90, 180, 365]);

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

function acceptUrl(requestUrl, token) {
  if (!token) return null;
  return new URL(`/shamar/convites?token=${encodeURIComponent(token)}`, getSiteOrigin(requestUrl)).toString();
}

function matchesSearch(journey, search) {
  if (!search) return true;
  const haystack = [
    journey.user?.email,
    journey.user?.full_name,
    journey.config?.turma,
    journey.mode,
    journey.status
  ].join(' ').toLowerCase();
  return haystack.includes(search.toLowerCase());
}

async function loadJourneys(supabase, requestUrl) {
  const { data: seasons, error: seasonsError } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status,patrimonio_inicial,patrimonio_final,identity_level,started_at,ended_at,created_at')
    .order('started_at', { ascending: false })
    .limit(220);

  if (seasonsError) throw seasonsError;

  const seasonRows = seasons || [];
  const seasonIds = seasonRows.map((season) => season.id);
  const userIds = [...new Set(seasonRows.map((season) => season.user_id).filter(Boolean))];
  const configIds = [...new Set(seasonRows.map((season) => season.tribo_config_id).filter(Boolean))];

  const [profilesResult, configsResult, invitesResult, contributionsResult, markedResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id,email,full_name,status,tier,turma').in('id', userIds)
      : { data: [], error: null },
    configIds.length > 0
      ? supabase
          .from('shamar_tribo_configs')
          .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active,created_by,created_at')
          .in('id', configIds)
      : { data: [], error: null },
    configIds.length > 0
      ? supabase
          .from('shamar_invites')
          .select('id,tribo_config_id,inviter_user_id,invited_email,mode,status,token,email_sent_at,email_error,accepted_at,created_at')
          .in('tribo_config_id', configIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null },
    seasonIds.length > 0
      ? supabase.from('shamar_contributions').select('season_id,amount').in('season_id', seasonIds)
      : { data: [], error: null },
    seasonIds.length > 0
      ? supabase.from('shamar_marked_squares').select('season_id').in('season_id', seasonIds)
      : { data: [], error: null }
  ]);

  const firstError = [
    profilesResult.error,
    configsResult.error,
    invitesResult.error,
    contributionsResult.error,
    markedResult.error
  ].find(Boolean);
  if (firstError) throw firstError;

  const profilesById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  const configsById = new Map((configsResult.data || []).map((config) => [config.id, config]));
  const contributionTotals = new Map();
  const markedCounts = new Map();
  const invitesByConfigAndInviter = new Map();

  for (const contribution of contributionsResult.data || []) {
    contributionTotals.set(
      contribution.season_id,
      roundMoney(toNumber(contributionTotals.get(contribution.season_id)) + toNumber(contribution.amount))
    );
  }

  for (const marked of markedResult.data || []) {
    markedCounts.set(marked.season_id, Number(markedCounts.get(marked.season_id) || 0) + 1);
  }

  for (const invite of invitesResult.data || []) {
    const key = `${invite.tribo_config_id}:${invite.inviter_user_id}`;
    const list = invitesByConfigAndInviter.get(key) || [];
    list.push({
      ...invite,
      accept_url: acceptUrl(requestUrl, invite.token),
      email_sent: Boolean(invite.email_sent_at)
    });
    invitesByConfigAndInviter.set(key, list);
  }

  return seasonRows.map((season) => {
    const profile = profilesById.get(season.user_id) || null;
    const config = configsById.get(season.tribo_config_id) || null;
    const mode = inferMode(config);
    const invitesKey = `${season.tribo_config_id}:${season.user_id}`;

    return {
      id: season.id,
      status: season.status,
      mode,
      user: profile,
      config: config
        ? {
            ...config,
            meta_total: toNumber(config.meta_total),
            mode
          }
        : null,
      season: {
        ...season,
        patrimonio_inicial: toNumber(season.patrimonio_inicial),
        patrimonio_final: season.patrimonio_final === null ? null : toNumber(season.patrimonio_final)
      },
      stats: {
        contributions_total: toNumber(contributionTotals.get(season.id)),
        squares_marked: Number(markedCounts.get(season.id) || 0)
      },
      invites: invitesByConfigAndInviter.get(invitesKey) || []
    };
  });
}

async function loadInviteWithProfile(supabase, inviteId) {
  const { data: invite, error: inviteError } = await supabase
    .from('shamar_invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) return { invite: null, inviter: null };

  const { data: inviter, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name')
    .eq('id', invite.inviter_user_id)
    .maybeSingle();

  if (profileError) throw profileError;
  return { invite, inviter: inviter || null };
}

async function resendInvite({ supabase, context, requestUrl, inviteId }) {
  const { invite, inviter } = await loadInviteWithProfile(supabase, inviteId);
  if (!invite) return NextResponse.json({ error: 'convite_nao_encontrado' }, { status: 404 });
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'convite_nao_esta_pendente', status: invite.status }, { status: 409 });
  }

  const url = acceptUrl(requestUrl, invite.token);
  const template = shamarInviteTemplate({
    inviterName: profileName(inviter),
    mode: invite.mode,
    acceptUrl: url
  });

  const emailResult = await sendEmail({
    userId: invite.inviter_user_id,
    to: invite.invited_email,
    subject: template.subject,
    html: template.html,
    emailType: 'shamar_invite_admin_resend',
    emailSnapshot: {
      mode: invite.mode,
      invite_id: invite.id,
      tribo_config_id: invite.tribo_config_id,
      accept_url: url,
      admin_user_id: context.user.id
    }
  });

  const patch = emailResult.success
    ? { email_sent_at: new Date().toISOString(), email_error: null, updated_at: new Date().toISOString() }
    : { email_error: emailResult.error || 'email_send_failed', updated_at: new Date().toISOString() };

  const { data: updatedInvite, error: updateError } = await supabase
    .from('shamar_invites')
    .update(patch)
    .eq('id', invite.id)
    .select('id,invited_email,mode,status,token,email_sent_at,email_error')
    .single();

  if (updateError) throw updateError;

  await recordAdminAudit({
    supabase: context.supabase,
    adminUserId: context.user.id,
    targetUserId: invite.inviter_user_id,
    action: 'resend',
    resource: 'shamar_invite',
    resourceId: invite.id,
    metadata: {
      invited_email: invite.invited_email,
      mode: invite.mode,
      success: emailResult.success,
      error: emailResult.error || null
    }
  });

  if (!emailResult.success) {
    return NextResponse.json(
      {
        error: emailResult.error || 'email_send_failed',
        invite: updatedInvite
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    invite: {
      ...updatedInvite,
      email_sent: Boolean(updatedInvite.email_sent_at),
      accept_url: acceptUrl(requestUrl, updatedInvite.token)
    }
  });
}

export async function GET(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const supabase = getShamarWriterSupabase(context.supabase);
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get('search') || '').trim();
  const mode = String(searchParams.get('mode') || '').trim();
  const status = String(searchParams.get('status') || '').trim();

  try {
    const journeys = (await loadJourneys(supabase, request.url))
      .filter((journey) => !mode || journey.mode === mode)
      .filter((journey) => !status || journey.status === status)
      .filter((journey) => matchesSearch(journey, search));

    return NextResponse.json({ journeys });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'admin_shamar_journeys_lookup_failed') }, { status: 500 });
  }
}

export async function POST(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const action = String(parsed.body?.action || '').trim();
  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    if (action === 'resend_invite') {
      const inviteId = normalizeId(parsed.body?.invite_id);
      if (!inviteId) return NextResponse.json({ error: 'invite_id_obrigatorio' }, { status: 422 });
      return resendInvite({ supabase, context, requestUrl: request.url, inviteId });
    }

    return NextResponse.json({ error: 'acao_invalida' }, { status: 422 });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'admin_shamar_journey_action_failed') }, { status: 500 });
  }
}

export async function PATCH(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const seasonId = normalizeId(parsed.body?.season_id);
  if (!seasonId) return NextResponse.json({ error: 'season_id_obrigatorio' }, { status: 422 });

  const status = parsed.body?.status === undefined ? undefined : String(parsed.body.status || '').trim();
  const turma = parsed.body?.turma === undefined ? undefined : String(parsed.body.turma || '').trim();
  const durationDays = parsed.body?.duration_days === undefined ? undefined : Number(parsed.body.duration_days);
  const startedAt = parsed.body?.started_at === undefined ? undefined : normalizeIsoDate(parsed.body.started_at);
  const isActive = parsed.body?.is_active;
  const patrimonioInicial = parsed.body?.patrimonio_inicial === undefined ? undefined : normalizeMoney(parsed.body.patrimonio_inicial);
  const patrimonioFinal = parsed.body?.patrimonio_final === undefined ? undefined : normalizeMoney(parsed.body.patrimonio_final);

  if (status !== undefined && !ALLOWED_STATUS.has(status)) return NextResponse.json({ error: 'status_invalido' }, { status: 422 });
  if (turma !== undefined && !turma) return NextResponse.json({ error: 'turma_obrigatoria' }, { status: 422 });
  if (durationDays !== undefined && !ALLOWED_DURATIONS.has(durationDays)) return NextResponse.json({ error: 'duration_days_invalido' }, { status: 422 });
  if (startedAt === null) return NextResponse.json({ error: 'started_at_invalido' }, { status: 422 });
  if (isActive !== undefined && typeof isActive !== 'boolean') return NextResponse.json({ error: 'is_active_invalido' }, { status: 422 });
  if (patrimonioInicial === null || patrimonioInicial < 0) return NextResponse.json({ error: 'patrimonio_inicial_invalido' }, { status: 422 });
  if (patrimonioFinal === null || patrimonioFinal < 0) return NextResponse.json({ error: 'patrimonio_final_invalido' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const { data: season, error: seasonLookupError } = await supabase
      .from('shamar_seasons')
      .select('id,user_id,tribo_config_id,status')
      .eq('id', seasonId)
      .maybeSingle();

    if (seasonLookupError) throw seasonLookupError;
    if (!season) return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });

    const seasonPatch = {};
    if (status !== undefined) {
      seasonPatch.status = status;
      seasonPatch.ended_at = status === 'active' ? null : new Date().toISOString();
    }
    if (patrimonioInicial !== undefined) seasonPatch.patrimonio_inicial = patrimonioInicial;
    if (patrimonioFinal !== undefined) seasonPatch.patrimonio_final = patrimonioFinal;

    const configPatch = {};
    if (turma !== undefined) configPatch.turma = turma;
    if (durationDays !== undefined) configPatch.duration_days = durationDays;
    if (startedAt !== undefined) configPatch.started_at = startedAt;
    if (isActive !== undefined) configPatch.is_active = isActive;

    if (Object.keys(seasonPatch).length > 0) {
      const { error: seasonUpdateError } = await supabase
        .from('shamar_seasons')
        .update(seasonPatch)
        .eq('id', seasonId);
      if (seasonUpdateError) throw seasonUpdateError;
    }

    if (Object.keys(configPatch).length > 0) {
      const { error: configUpdateError } = await supabase
        .from('shamar_tribo_configs')
        .update(configPatch)
        .eq('id', season.tribo_config_id);
      if (configUpdateError) throw configUpdateError;
    }

    await recordAdminAudit({
      supabase: context.supabase,
      adminUserId: context.user.id,
      targetUserId: season.user_id,
      action: 'update',
      resource: 'shamar_journey',
      resourceId: seasonId,
      metadata: {
        season_patch: seasonPatch,
        config_patch: configPatch
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'admin_shamar_journey_update_failed') }, { status: 500 });
  }
}

export async function DELETE(request) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const seasonId = normalizeId(parsed.body?.season_id);
  if (!seasonId) return NextResponse.json({ error: 'season_id_obrigatorio' }, { status: 422 });

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const { data: season, error: seasonLookupError } = await supabase
      .from('shamar_seasons')
      .select('id,user_id,tribo_config_id,status')
      .eq('id', seasonId)
      .maybeSingle();

    if (seasonLookupError) throw seasonLookupError;
    if (!season) return NextResponse.json({ error: 'temporada_nao_encontrada' }, { status: 404 });

    const { error: partnershipDeleteError } = await supabase
      .from('shamar_partnerships')
      .delete()
      .or(`season_id_a.eq.${seasonId},season_id_b.eq.${seasonId}`);

    if (partnershipDeleteError) throw partnershipDeleteError;

    const { error: inviteCancelError } = await supabase
      .from('shamar_invites')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('tribo_config_id', season.tribo_config_id)
      .eq('inviter_user_id', season.user_id)
      .eq('status', 'pending');

    if (inviteCancelError) throw inviteCancelError;

    const { error: deleteError } = await supabase
      .from('shamar_seasons')
      .delete()
      .eq('id', seasonId);

    if (deleteError) throw deleteError;

    const { count, error: remainingError } = await supabase
      .from('shamar_seasons')
      .select('id', { count: 'exact', head: true })
      .eq('tribo_config_id', season.tribo_config_id);

    if (remainingError) throw remainingError;
    if (Number(count || 0) === 0) {
      await supabase.from('shamar_tribo_configs').delete().eq('id', season.tribo_config_id);
    }

    await recordAdminAudit({
      supabase: context.supabase,
      adminUserId: context.user.id,
      targetUserId: season.user_id,
      action: 'delete',
      resource: 'shamar_journey',
      resourceId: seasonId,
      metadata: {
        tribo_config_id: season.tribo_config_id,
        deleted_config: Number(count || 0) === 0
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'admin_shamar_journey_delete_failed') }, { status: 500 });
  }
}
