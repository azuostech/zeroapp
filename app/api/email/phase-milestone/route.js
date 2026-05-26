import { NextResponse } from 'next/server';
import { authorizeCronOrAdmin } from '@/src/lib/email/request-auth';
import { coletarResumoJornada } from '@/src/lib/email/user-data-collector';
import { phaseMilestoneTemplate } from '@/src/lib/email/templates/phase-milestone';
import { sendEmail } from '@/src/lib/email/email-service';

export const runtime = 'nodejs';

function normalizeUserId(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
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
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const userId = normalizeUserId(body?.user_id);
  if (!userId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  try {
    const snapshot = await coletarResumoJornada(userId);

    if (!snapshot?.profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    const recipient = String(snapshot.profile.email || '').trim();
    if (!recipient) {
      return NextResponse.json({ error: 'missing_email' }, { status: 422 });
    }

    const faseName = String(body?.fase_nome || snapshot?.jornada?.fase?.nome || 'Bombeiro');
    const faseEmoji = String(body?.fase_emoji || snapshot?.jornada?.fase?.emoji || '🔥');
    const coinsTotal = Number(body?.coins_total ?? snapshot?.coins?.total ?? 0);

    const recompensas = Array.isArray(body?.recompensas)
      ? body.recompensas.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : Array.isArray(snapshot?.jornada?.fase?.recompensas)
        ? snapshot.jornada.fase.recompensas
        : [];

    const { subject, html } = phaseMilestoneTemplate({
      profile: snapshot.profile,
      faseName,
      faseEmoji,
      coinsTotal,
      recompensas
    });

    const result = await sendEmail({
      userId,
      to: recipient,
      subject,
      html,
      emailType: 'phase_milestone'
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || 'phase_milestone_email_failed'
      },
      { status: 500 }
    );
  }
}
