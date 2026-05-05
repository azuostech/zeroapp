// app/api/mavf/sessions/[id]/complete/route.js
// POST /api/mavf/sessions/{id}/complete — Finalizar sessão

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

  return NextResponse.json({ 
    session,
    message: 'Sessão finalizada com sucesso!'
  });
}
