// app/api/mavf/responses/route.js
// POST /api/mavf/responses — Salvar resposta
// GET /api/mavf/responses?session_id={id}&user_id={id} — Buscar respostas

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, pillar, score } = body;

  if (!session_id || !pillar || score === undefined) {
    return NextResponse.json({ 
      error: 'Missing required fields: session_id, pillar, score' 
    }, { status: 400 });
  }

  if (score < 0 || score > 10) {
    return NextResponse.json({ 
      error: 'Score must be between 0 and 10' 
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

  // Checar se a sessão está ativa
  const { data: session } = await supabase
    .from('mavf_sessions')
    .select('status, current_pillar, title')
    .eq('id', session_id)
    .single();

  if (!session) {
    return NextResponse.json({ 
      error: 'Session not found' 
    }, { status: 404 });
  }

  if (session.status !== 'active') {
    return NextResponse.json({ 
      error: 'Session is not active',
      session_status: session.status
    }, { status: 400 });
  }

  if (session.current_pillar && pillar !== session.current_pillar) {
    return NextResponse.json(
      {
        error: 'Pilar não liberado no momento',
        current_pillar: session.current_pillar
      },
      { status: 400 }
    );
  }

  // Upsert (inserir ou atualizar se já existe)
  const { data: response, error } = await supabase
    .from('mavf_responses')
    .upsert({
      session_id,
      user_id: user.id,
      pillar,
      score
    }, {
      onConflict: 'session_id,user_id,pillar'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Checar quantos pilares o usuário já completou nesta sessão
  const { count } = await supabase
    .from('mavf_responses')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session_id)
    .eq('user_id', user.id);

  const allCompleted = count === 11;

  // 🎯 HOOK PARA GAMIFICAÇÃO FUTURA
  // Quando você adicionar coins, descomente isto:
  /*
  if (allCompleted) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/coins/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        action_type: 'mavf_completed',
        amount: 50,
        description: `Completou MAVF: ${session.title}`
      })
    });
  }
  */

  return NextResponse.json({ 
    response,
    progress: {
      completed: count,
      total: 11,
      percentage: Math.round((count / 11) * 100),
      all_completed: allCompleted
    }
  });
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');
  const user_id = searchParams.get('user_id');
  const includeAll = searchParams.get('all') === '1';

  if (!session_id) {
    return NextResponse.json({ 
      error: 'Missing session_id parameter' 
    }, { status: 400 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Se user_id não foi passado, buscar do usuário logado
  const target_user_id = user_id || user.id;

  // Apenas o próprio usuário ou admin pode ver respostas
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  const isAdmin = Boolean(profile?.is_admin);

  if (includeAll && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (target_user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = supabase
    .from('mavf_responses')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (!includeAll) {
    query = query.eq('user_id', target_user_id);
  }

  const { data: responses, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const safeResponses = responses || [];
  const participantsCount = new Set(safeResponses.map((item) => item.user_id)).size;

  return NextResponse.json({
    responses: safeResponses,
    summary: {
      participants_count: participantsCount
    }
  });
}
