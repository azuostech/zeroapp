// app/api/mavf/sessions/[id]/start/route.js
// POST /api/mavf/sessions/{id}/start — Iniciar sessão e liberar pilar

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const supabase = await createServerSupabase();
  const { id } = params;
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Checar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
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

  // TODO: Enviar push notification para todos tier MOVIMENTO+
  // Quando implementar PWA, adicionar aqui

  return NextResponse.json({ 
    session,
    message: `Pilar ${pillar} liberado com sucesso!`
  });
}
