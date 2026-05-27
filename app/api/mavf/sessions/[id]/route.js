import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

function normalizeTitle(value) {
  return String(value || '').trim();
}

function normalizeColor(value) {
  return String(value || '').trim();
}

async function requireAdminContext(supabase) {
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId: null
  });

  if (!context.ok) {
    return { ok: false, response: NextResponse.json({ error: context.error }, { status: context.status }) };
  }

  if (!context.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: 'Admin only' }, { status: 403 }) };
  }

  return { ok: true, context };
}

export async function PATCH(request, { params }) {
  const supabase = await createServerSupabase();
  const guard = await requireAdminContext(supabase);
  if (!guard.ok) return guard.response;

  const { context } = guard;
  const { id } = await params;
  const body = await request.json();

  const updates = {};

  if (body?.title !== undefined) {
    const title = normalizeTitle(body.title);
    if (title.length < 3) {
      return NextResponse.json({ error: 'Título deve ter pelo menos 3 caracteres.' }, { status: 400 });
    }
    if (title.length > 120) {
      return NextResponse.json({ error: 'Título deve ter no máximo 120 caracteres.' }, { status: 400 });
    }
    updates.title = title;
  }

  if (body?.color_hex !== undefined) {
    const colorHex = normalizeColor(body.color_hex);
    if (!/^#[0-9A-F]{6}$/i.test(colorHex)) {
      return NextResponse.json({ error: 'Cor inválida. Use #RRGGBB.' }, { status: 400 });
    }
    updates.color_hex = colorHex;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar.' }, { status: 400 });
  }

  const { data: session, error } = await supabase.from('mavf_sessions').update(updates).eq('id', id).select('*').single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar sessão.' }, { status: 500 });
  }

  await recordAdminAudit({
    supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'update',
    resource: 'mavf_session',
    resourceId: id,
    metadata: {
      action: 'edit_session',
      updates
    }
  });

  return NextResponse.json({
    session,
    message: 'Sessão atualizada com sucesso.'
  });
}

export async function DELETE(request, { params }) {
  const supabase = await createServerSupabase();
  const guard = await requireAdminContext(supabase);
  if (!guard.ok) return guard.response;

  const { context } = guard;
  const { id } = await params;

  const { data: session, error: lookupError } = await supabase
    .from('mavf_sessions')
    .select('id,title,status,color_hex,created_at,started_at,completed_at')
    .eq('id', id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message || 'Erro ao buscar sessão.' }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 });
  }

  const { error } = await supabase.from('mavf_sessions').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir sessão.' }, { status: 500 });
  }

  await recordAdminAudit({
    supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: 'delete',
    resource: 'mavf_session',
    resourceId: id,
    metadata: {
      action: 'delete_session',
      session_snapshot: session
    }
  });

  return NextResponse.json({
    message: 'Sessão excluída com sucesso.'
  });
}
