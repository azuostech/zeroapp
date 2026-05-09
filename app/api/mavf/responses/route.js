// app/api/mavf/responses/route.js
// POST /api/mavf/responses — Salvar resposta
// GET /api/mavf/responses?session_id={id}&user_id={id} — Buscar respostas

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

const VALID_PILLARS = [
  'financeiro',
  'profissional',
  'emocional',
  'espiritual',
  'parentes',
  'conjugal',
  'filhos',
  'social',
  'saude',
  'servir',
  'intelectual'
];

export async function POST(request) {
  const supabase = await createServerSupabase();

  const body = await request.json();
  const { session_id, pillar, score } = body;

  if (!session_id || !pillar || score === undefined) {
    return NextResponse.json(
      {
        error: 'Missing required fields: session_id, pillar, score'
      },
      { status: 400 }
    );
  }

  if (score < 0 || score > 10) {
    return NextResponse.json(
      {
        error: 'Score must be between 0 and 10'
      },
      { status: 400 }
    );
  }

  if (!VALID_PILLARS.includes(pillar)) {
    return NextResponse.json(
      {
        error: `Invalid pillar. Must be one of: ${VALID_PILLARS.join(', ')}`
      },
      { status: 400 }
    );
  }

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId: body?.user_id
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { data: session } = await supabase
    .from('mavf_sessions')
    .select('status, current_pillar, title')
    .eq('id', session_id)
    .single();

  if (!session) {
    return NextResponse.json(
      {
        error: 'Session not found'
      },
      { status: 404 }
    );
  }

  if (session.status !== 'active') {
    return NextResponse.json(
      {
        error: 'Session is not active',
        session_status: session.status
      },
      { status: 400 }
    );
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

  const { data: response, error } = await supabase
    .from('mavf_responses')
    .upsert(
      {
        session_id,
        user_id: context.targetUserId,
        pillar,
        score
      },
      {
        onConflict: 'session_id,user_id,pillar'
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count } = await supabase
    .from('mavf_responses')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session_id)
    .eq('user_id', context.targetUserId);

  const allCompleted = count === 11;

  if (context.impersonating) {
    await recordAdminAudit({
      supabase,
      adminUserId: context.user.id,
      targetUserId: context.targetUserId,
      action: 'upsert',
      resource: 'mavf_response',
      resourceId: response?.id || `${session_id}:${context.targetUserId}:${pillar}`,
      metadata: {
        session_id,
        pillar,
        score
      }
    });
  }

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
  const requestedUserId = searchParams.get('user_id');
  const includeAll = searchParams.get('all') === '1';

  if (!session_id) {
    return NextResponse.json(
      {
        error: 'Missing session_id parameter'
      },
      { status: 400 }
    );
  }

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (includeAll && (!context.isAdmin || context.impersonating)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = supabase.from('mavf_responses').select('*').eq('session_id', session_id).order('created_at', { ascending: true });

  if (!includeAll) {
    query = query.eq('user_id', context.targetUserId);
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
