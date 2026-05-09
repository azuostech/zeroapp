// app/api/mavf/sessions/route.js
// GET /api/mavf/sessions — Listar sessões
// POST /api/mavf/sessions — Criar nova sessão (admin only)

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MAVF_ALLOWED_TIERS } from '@/lib/mavf-config';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

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

    return NextResponse.json({ sessions: sessions || [] });
  }

  const { data: participatedRows, error: participationError } = await supabase
    .from('mavf_responses')
    .select('session_id')
    .eq('user_id', context.targetUserId);

  if (participationError) {
    return NextResponse.json({ error: participationError.message }, { status: 500 });
  }

  const sessionIds = [...new Set((participatedRows || []).map((row) => row.session_id).filter(Boolean))];

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

  return NextResponse.json({ sessions: sessions || [] });
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

  await recordAdminAudit({
    supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'create',
    resource: 'mavf_session',
    resourceId: session?.id || null,
    metadata: {
      title,
      color_hex
    }
  });

  return NextResponse.json({ session }, { status: 201 });
}
