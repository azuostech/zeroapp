// app/api/mavf/sessions/route.js
// GET /api/mavf/sessions — Listar sessões
// POST /api/mavf/sessions — Criar nova sessão (admin only)

import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar perfil para checar tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, is_admin')
    .eq('id', user.id)
    .single();

  // Apenas tier MOVIMENTO+ pode acessar
  const allowedTiers = ['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];
  if (!allowedTiers.includes(profile?.tier) && !profile?.is_admin) {
    return NextResponse.json({ 
      error: 'Recurso exclusivo para membros da Mentoria em Grupo',
      tier_required: 'MOVIMENTO',
      current_tier: profile?.tier || 'DESPERTAR'
    }, { status: 403 });
  }

  // Listar sessões (ordenar por data, mais recentes primeiro)
  const { data: sessions, error } = await supabase
    .from('mavf_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}

export async function POST(request) {
  const supabase = await createServerSupabase();
  
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
  const { title, color_hex } = body;

  if (!title || !color_hex) {
    return NextResponse.json({ 
      error: 'Missing required fields: title, color_hex' 
    }, { status: 400 });
  }

  // Validar formato de cor hex
  if (!/^#[0-9A-F]{6}$/i.test(color_hex)) {
    return NextResponse.json({ 
      error: 'Invalid color_hex format. Use #RRGGBB' 
    }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from('mavf_sessions')
    .insert({
      created_by_admin_id: user.id,
      title,
      color_hex,
      status: 'draft'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session }, { status: 201 });
}
