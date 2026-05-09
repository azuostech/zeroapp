// app/api/mavf/sessions/[id]/start/route.js
// POST /api/mavf/sessions/{id}/start — Iniciar sessão e liberar pilar

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

export async function POST(request, { params }) {
  const supabase = await createServerSupabase();
  const { id } = params;
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
  const { data: currentSession } = await supabase
    .from('mavf_sessions')
    .select('status')
    .eq('id', id)
    .single();

  if (currentSession?.status === 'draft') {
    updateData.status = 'active';
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
      pillar
    }
  });

  // TODO: Enviar push notification para todos tier MOVIMENTO+
  // Quando implementar PWA, adicionar aqui

  return NextResponse.json({ 
    session,
    message: `Pilar ${pillar} liberado com sucesso!`
  });
}
