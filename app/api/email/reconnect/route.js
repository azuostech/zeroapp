import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { authorizeCronOrAdmin } from '@/src/lib/email/request-auth';
import { coletarResumoJornada } from '@/src/lib/email/user-data-collector';
import { reconnectTemplate } from '@/src/lib/email/templates/reconnect';
import { sendEmail } from '@/src/lib/email/email-service';

export const runtime = 'nodejs';

function normalizeUserId(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function resolveDays(raw) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
    return 10;
  }
  return parsed;
}

export async function POST(request) {
  const auth = await authorizeCronOrAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    body = {};
  }

  const requestedUserId = normalizeUserId(body?.user_id);
  const diasSemAcesso = resolveDays(body?.dias_sem_acesso);

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - diasSemAcesso);
  const cutoffIso = cutoff.toISOString();

  let serviceSupabase;
  try {
    serviceSupabase = getServiceSupabase();
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'service_client_unavailable' }, { status: 500 });
  }

  let users = [];
  if (requestedUserId) {
    const { data, error } = await serviceSupabase
      .from('profiles')
      .select('id, email, full_name, status')
      .eq('id', requestedUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message || 'profile_query_failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'active_user_not_found' }, { status: 404 });
    }

    users = [data];
  } else {
    const { data, error } = await serviceSupabase
      .from('profiles')
      .select('id, email, full_name, status')
      .eq('status', 'active')
      .not('email', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message || 'profiles_query_failed' }, { status: 500 });
    }

    users = data || [];
  }

  const { data: recentEvents, error: eventsError } = await serviceSupabase
    .from('feed_events')
    .select('user_id')
    .gte('created_at', cutoffIso);

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message || 'feed_events_query_failed' }, { status: 500 });
  }

  const recentUserIds = new Set((recentEvents || []).map((item) => item.user_id));
  const targetUsers = users.filter((user) => !recentUserIds.has(user.id));

  const results = [];

  for (const user of targetUsers) {
    try {
      const snapshot = await coletarResumoJornada(user.id);
      const recipient = String(snapshot?.profile?.email || user.email || '').trim();

      if (!recipient) {
        results.push({
          user_id: user.id,
          success: false,
          skipped: 'missing_email'
        });
        continue;
      }

      const { subject, html } = reconnectTemplate({
        profile: snapshot.profile || user,
        diasSemAcesso,
        coinsTotal: snapshot?.coins?.total || 0,
        faseName: snapshot?.jornada?.fase?.nome || 'Bombeiro',
        faseEmoji: snapshot?.jornada?.fase?.emoji || '🔥'
      });

      const sent = await sendEmail({
        userId: user.id,
        to: recipient,
        subject,
        html,
        emailType: 'reconnect'
      });

      results.push({ user_id: user.id, ...sent });
    } catch (error) {
      results.push({
        user_id: user.id,
        success: false,
        error: error?.message || 'reconnect_email_failed'
      });
    }
  }

  const sentCount = results.filter((item) => item.success === true).length;
  const skippedCount = results.filter((item) => Boolean(item.skipped)).length;
  const failedCount = results.filter((item) => item.success === false && !item.skipped).length;

  return NextResponse.json({
    dias_sem_acesso: diasSemAcesso,
    cutoff_iso: cutoffIso,
    total_candidates: targetUsers.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    results
  });
}
