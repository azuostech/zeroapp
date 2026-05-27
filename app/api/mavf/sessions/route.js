// app/api/mavf/sessions/route.js
// GET /api/mavf/sessions — Listar sessões
// POST /api/mavf/sessions — Criar nova sessão (admin only)

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MAVF_ALLOWED_TIERS } from '@/lib/mavf-config';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

function isMissingParticipantsTableError(error) {
  const message = String(error?.message || '');
  return error?.code === 'PGRST205' || message.includes("Could not find the table 'public.mavf_session_participants'");
}

async function withParticipantsCount(supabase, sessions) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  if (!safeSessions.length) return [];

  const sessionIds = safeSessions.map((item) => item?.id).filter(Boolean);
  if (!sessionIds.length) return safeSessions;

  const { data, error } = await supabase
    .from('mavf_session_participants')
    .select('session_id')
    .in('session_id', sessionIds);

  if (error) {
    if (isMissingParticipantsTableError(error)) {
      return safeSessions.map((session) => ({
        ...session,
        participants_count: 0
      }));
    }

    throw new Error(error.message || 'Erro ao carregar participantes da sessão');
  }

  const counts = new Map();
  (data || []).forEach((row) => {
    const key = row?.session_id;
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return safeSessions.map((session) => ({
    ...session,
    participants_count: counts.get(session.id) || 0
  }));
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const requestedUserId = request.nextUrl.searchParams.get('user_id');

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!context.isAdmin && !MAVF_ALLOWED_TIERS.includes(context.profile?.tier)) {
    return NextResponse.json(
      {
        error: 'Recurso exclusivo para membros da Mentoria em Grupo',
        tier_required: 'MOVIMENTO',
        current_tier: context.profile?.tier || 'DESPERTAR'
      },
      { status: 403 }
    );
  }

  if (context.isAdmin && !context.impersonating) {
    const { data: sessions, error } = await supabase
      .from('mavf_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const list = await withParticipantsCount(supabase, sessions || []);
      return NextResponse.json({ sessions: list });
    } catch (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
  }

  const [{ data: participatedRows, error: participationError }, { data: assignedRows, error: assignmentError }] = await Promise.all([
    supabase.from('mavf_responses').select('session_id').eq('user_id', context.targetUserId),
    supabase.from('mavf_session_participants').select('session_id').eq('user_id', context.targetUserId)
  ]);

  if (participationError) {
    return NextResponse.json({ error: participationError.message }, { status: 500 });
  }

  let activeRows = [];
  if (assignmentError) {
    if (!isMissingParticipantsTableError(assignmentError)) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    const { data: legacyActiveRows, error: legacyActiveError } = await supabase
      .from('mavf_sessions')
      .select('id')
      .eq('status', 'active');

    if (legacyActiveError) {
      return NextResponse.json({ error: legacyActiveError.message }, { status: 500 });
    }

    activeRows = legacyActiveRows || [];
  }

  const sessionIds = [
    ...new Set([
      ...(participatedRows || []).map((row) => row.session_id).filter(Boolean),
      ...(assignedRows || []).map((row) => row.session_id).filter(Boolean),
      ...activeRows.map((row) => row.id).filter(Boolean)
    ])
  ];

  if (!sessionIds.length) {
    return NextResponse.json({ sessions: [] });
  }

  const { data: sessions, error } = await supabase
    .from('mavf_sessions')
    .select('*')
    .in('id', sessionIds)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const list = await withParticipantsCount(supabase, sessions || []);
    return NextResponse.json({ sessions: list });
  } catch (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
}

export async function POST(request) {
  const supabase = await createServerSupabase();

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId: null
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!context.isAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await request.json();
  const { title, color_hex } = body;
  const rawParticipantIds = Array.isArray(body?.participants_user_ids) ? body.participants_user_ids : [];
  const participantIds = [...new Set(rawParticipantIds.map((item) => String(item || '').trim()).filter(Boolean))];

  if (!title || !color_hex) {
    return NextResponse.json(
      {
        error: 'Missing required fields: title, color_hex'
      },
      { status: 400 }
    );
  }

  if (!/^#[0-9A-F]{6}$/i.test(color_hex)) {
    return NextResponse.json(
      {
        error: 'Invalid color_hex format. Use #RRGGBB'
      },
      { status: 400 }
    );
  }

  if (participantIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,status,tier')
      .in('id', participantIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
    const missingIds = participantIds.filter((id) => !profileMap.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: 'Usuários inválidos na lista de participantes.' }, { status: 400 });
    }

    const invalidTierIds = participantIds.filter((id) => !MAVF_ALLOWED_TIERS.includes(profileMap.get(id)?.tier));
    if (invalidTierIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Todos os participantes devem ser tier MOVIMENTO ou superior.'
        },
        { status: 400 }
      );
    }
  }

  const { data: session, error } = await supabase
    .from('mavf_sessions')
    .insert({
      created_by_admin_id: context.user.id,
      title,
      color_hex,
      status: 'draft'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (participantIds.length > 0) {
    const rows = participantIds.map((userId) => ({
      session_id: session.id,
      user_id: userId,
      added_by_admin_id: context.user.id
    }));

    const { error: participantsError } = await supabase.from('mavf_session_participants').insert(rows);
    if (participantsError) {
      if (isMissingParticipantsTableError(participantsError)) {
        return NextResponse.json(
          {
            error: 'Tabela mavf_session_participants não encontrada. Execute scripts/migrate-etapa6-mavf-participantes.sql no SQL Editor do Supabase.'
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }
  }

  await recordAdminAudit({
    supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'create',
    resource: 'mavf_session',
    resourceId: session?.id || null,
    metadata: {
      title,
      color_hex,
      participants_count: participantIds.length
    }
  });

  return NextResponse.json({ session: { ...session, participants_count: participantIds.length } }, { status: 201 });
}
