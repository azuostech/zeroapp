import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { MAVF_ALLOWED_TIERS } from '@/lib/mavf-config';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

function isMissingParticipantsTableError(error) {
  const message = String(error?.message || '');
  return error?.code === 'PGRST205' || message.includes("Could not find the table 'public.mavf_session_participants'");
}

function missingParticipantsTableResponse() {
  return NextResponse.json(
    {
      error: 'Tabela mavf_session_participants não encontrada. Execute scripts/migrate-etapa6-mavf-participantes.sql no SQL Editor do Supabase.'
    },
    { status: 500 }
  );
}

export async function GET(request, { params }) {
  const supabase = await createServerSupabase();
  const { id: sessionId } = await params;

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

  const { data: rows, error } = await supabase
    .from('mavf_session_participants')
    .select('user_id,created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingParticipantsTableError(error)) {
      return missingParticipantsTableResponse();
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((rows || []).map((item) => item.user_id).filter(Boolean))];

  if (!userIds.length) {
    return NextResponse.json({ participants: [] });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,email,full_name,status,tier')
    .in('id', userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
  const participants = userIds.map((userId) => ({
    user_id: userId,
    profile: profileMap.get(userId) || null
  }));

  return NextResponse.json({ participants });
}

export async function PUT(request, { params }) {
  const supabase = await createServerSupabase();
  const { id: sessionId } = await params;

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
  const rawUserIds = Array.isArray(body?.user_ids) ? body.user_ids : [];
  const userIds = [...new Set(rawUserIds.map((item) => String(item || '').trim()).filter(Boolean))];

  const { data: session, error: sessionError } = await supabase
    .from('mavf_sessions')
    .select('id,title,status')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,email,full_name,status,tier')
      .in('id', userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
    const missingIds = userIds.filter((id) => !profileMap.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json({ error: 'Alguns usuários informados não existem.' }, { status: 400 });
    }

    const inactiveIds = userIds.filter((id) => profileMap.get(id)?.status !== 'active');
    if (inactiveIds.length > 0) {
      return NextResponse.json({ error: 'Todos os participantes precisam estar com status active.' }, { status: 400 });
    }

    const invalidTierIds = userIds.filter((id) => !MAVF_ALLOWED_TIERS.includes(profileMap.get(id)?.tier));
    if (invalidTierIds.length > 0) {
      return NextResponse.json({ error: 'Todos os participantes precisam ter tier MOVIMENTO ou superior.' }, { status: 400 });
    }
  }

  const { error: deleteError } = await supabase.from('mavf_session_participants').delete().eq('session_id', sessionId);
  if (deleteError) {
    if (isMissingParticipantsTableError(deleteError)) {
      return missingParticipantsTableResponse();
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (userIds.length > 0) {
    const rows = userIds.map((userId) => ({
      session_id: sessionId,
      user_id: userId,
      added_by_admin_id: context.user.id
    }));

    const { error: insertError } = await supabase.from('mavf_session_participants').insert(rows);
    if (insertError) {
      if (isMissingParticipantsTableError(insertError)) {
        return missingParticipantsTableResponse();
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  await recordAdminAudit({
    supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'update',
    resource: 'mavf_session',
    resourceId: sessionId,
    metadata: {
      action: 'replace_participants',
      participants_count: userIds.length
    }
  });

  const { data: updatedProfiles, error: updatedProfilesError } = userIds.length
    ? await supabase.from('profiles').select('id,email,full_name,status,tier').in('id', userIds)
    : { data: [], error: null };

  if (updatedProfilesError) {
    return NextResponse.json({ error: updatedProfilesError.message }, { status: 500 });
  }

  const profileMap = new Map((updatedProfiles || []).map((item) => [item.id, item]));
  const participants = userIds.map((userId) => ({
    user_id: userId,
    profile: profileMap.get(userId) || null
  }));

  return NextResponse.json({
    session: {
      ...session,
      participants_count: userIds.length
    },
    participants
  });
}
