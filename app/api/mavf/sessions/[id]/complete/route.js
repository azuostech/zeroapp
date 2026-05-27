// app/api/mavf/sessions/[id]/complete/route.js
// POST /api/mavf/sessions/{id}/complete — Finalizar sessão

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

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

  const { data: session, error } = await supabase
    .from('mavf_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      current_pillar: null
    })
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
      action: 'complete_session'
    }
  });

  return NextResponse.json({ 
    session,
    message: 'Sessão finalizada com sucesso!'
  });
}
