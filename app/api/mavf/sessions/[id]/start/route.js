// app/api/mavf/sessions/[id]/start/route.js
// POST /api/mavf/sessions/{id}/start — Iniciar sessão e liberar pilar

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

function isMissingParticipantsTableError(error) {
  const message = String(error?.message || '');
  return error?.code === 'PGRST205' || message.includes("Could not find the table 'public.mavf_session_participants'");
}

export async function POST(request, { params }) {
  const supabase = await createServerSupabase();
  const { id } = await params;
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
  const { pillar } = body;

  if (!pillar) {
    return NextResponse.json({ 
      error: 'Missing required field: pillar' 
    }, { status: 400 });
  }

  // Validar pillar
  const validPillars = [
    'financeiro', 'profissional', 'emocional', 'espiritual',
    'parentes', 'conjugal', 'filhos', 'social',
    'saude', 'servir', 'intelectual'
  ];

  if (!validPillars.includes(pillar)) {
    return NextResponse.json({ 
      error: `Invalid pillar. Must be one of: ${validPillars.join(', ')}` 
    }, { status: 400 });
  }

  // Atualizar sessão
  const updateData = {
    current_pillar: pillar
  };

  // Se estava em draft, mudar para active e setar started_at
  const { data: currentSession, error: currentSessionError } = await supabase
    .from('mavf_sessions')
    .select('status')
    .eq('id', id)
    .single();

  if (currentSessionError) {
    return NextResponse.json({ error: currentSessionError.message || 'Erro ao carregar sessão.' }, { status: 500 });
  }

  if (!currentSession) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 });
  }

  const previousStatus = currentSession?.status || null;

  if (previousStatus === 'draft' || previousStatus === 'completed') {
    const { count: participantsCount, error: participantsError } = await supabase
      .from('mavf_session_participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', id);

    if (participantsError && !isMissingParticipantsTableError(participantsError)) {
      return NextResponse.json({ error: participantsError.message }, { status: 500 });
    }

    if (!participantsError && Number(participantsCount || 0) === 0) {
      return NextResponse.json(
        {
          error:
            previousStatus === 'completed'
              ? 'Defina pelo menos um participante para reativar esta sessão.'
              : 'Defina pelo menos um participante para ativar esta sessão.'
        },
        { status: 400 }
      );
    }
  }

  if (previousStatus === 'draft') {
    updateData.status = 'active';
    updateData.started_at = new Date().toISOString();
  }

  if (previousStatus === 'completed') {
    updateData.status = 'active';
    updateData.completed_at = null;
    updateData.started_at = new Date().toISOString();
  }

  const { data: session, error } = await supabase
    .from('mavf_sessions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAdminAudit({
    supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'update',
    resource: 'mavf_session',
    resourceId: id,
    metadata: {
      action: 'start_pillar',
      pillar,
      previous_status: previousStatus
    }
  });

  // TODO: Enviar push notification para todos tier MOVIMENTO+
  // Quando implementar PWA, adicionar aqui

  const reopened = previousStatus === 'completed';

  return NextResponse.json({ 
    session,
    message: reopened
      ? `Sessão reativada e pilar ${pillar} liberado com sucesso!`
      : `Pilar ${pillar} liberado com sucesso!`
  });
}
