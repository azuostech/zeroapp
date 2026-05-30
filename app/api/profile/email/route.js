import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

const LINKED_TABLES = [
  { table: 'financial_data', label: 'Dados financeiros' },
  { table: 'coins_transactions', label: 'Histórico de coins' },
  { table: 'gains', label: 'Registro de ganhos' },
  { table: 'gratitude_entries', label: 'Registro de gratidão' },
  { table: 'identity_declarations', label: 'Declarações de identidade' },
  { table: 'mavf_objectives', label: 'Objetivos MAVF' },
  { table: 'mavf_responses', label: 'Respostas MAVF' },
  { table: 'mavf_session_participants', label: 'Participação em sessões MAVF' },
  { table: 'feed_events', label: 'Eventos da comunidade' },
  { table: 'feed_reactions', label: 'Reações da comunidade' },
  { table: 'weekly_challenge_participations', label: 'Participações em desafios' }
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function getEmailEligibility(supabase, userId) {
  const checks = await Promise.all(
    LINKED_TABLES.map(async ({ table, label }) => {
      const { count, error } = await supabase
        .from(table)
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        table,
        label,
        count: Number(count || 0),
        error: error ? String(error.message || 'query_failed') : null
      };
    })
  );

  const blockedBy = checks.filter((item) => item.count > 0);
  const failed = checks.filter((item) => item.error);

  return {
    canChangeEmail: blockedBy.length === 0 && failed.length === 0,
    blockedBy,
    failed
  };
}

async function resolveAuthContext() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return { supabase, user: null, profile: null, unauthorized: true };
  }

  return { supabase, user, profile, unauthorized: false };
}

export async function GET() {
  const { supabase, user, unauthorized } = await resolveAuthContext();

  if (unauthorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const eligibility = await getEmailEligibility(supabase, user.id);

  return NextResponse.json({
    can_change_email: eligibility.canChangeEmail,
    blocked_by: eligibility.blockedBy,
    checks_failed: eligibility.failed
  });
}

export async function POST(request) {
  const { supabase, user, unauthorized } = await resolveAuthContext();

  if (unauthorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const nextEmail = String(body?.email || '').trim().toLowerCase();

  if (!isValidEmail(nextEmail)) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  }

  if (nextEmail === String(user.email || '').trim().toLowerCase()) {
    return NextResponse.json({ error: 'Este e-mail já é o atual da sua conta.' }, { status: 400 });
  }

  const eligibility = await getEmailEligibility(supabase, user.id);
  if (!eligibility.canChangeEmail) {
    return NextResponse.json(
      {
        error: 'E-mail não pode ser alterado porque sua conta já possui vínculos no banco.',
        code: 'email_change_blocked_by_links',
        blocked_by: eligibility.blockedBy,
        checks_failed: eligibility.failed
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) {
    return NextResponse.json({ error: error.message || 'Não foi possível iniciar a alteração de e-mail.' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Solicitação enviada. Verifique seu e-mail atual e o novo e-mail para confirmar a alteração.'
  });
}
