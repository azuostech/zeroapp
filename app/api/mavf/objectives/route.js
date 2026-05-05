import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MAVF_ALLOWED_TIERS, MAVF_PILLAR_IDS } from '@/lib/mavf-config';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function getAuthContext(supabase) {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) return { user: null, profile: null };

  const { data: profile } = await supabase.from('profiles').select('tier, is_admin').eq('id', user.id).single();
  return { user, profile };
}

function canAccessObjectives(profile) {
  return Boolean(profile?.is_admin) || MAVF_ALLOWED_TIERS.includes(profile?.tier);
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('user_id');

  const { user, profile } = await getAuthContext(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canAccessObjectives(profile)) {
    return NextResponse.json(
      {
        error: 'Recurso exclusivo para membros da Mentoria em Grupo',
        tier_required: 'MOVIMENTO',
        current_tier: profile?.tier || 'DESPERTAR'
      },
      { status: 403 }
    );
  }

  const targetUserId = profile?.is_admin && requestedUserId ? requestedUserId : user.id;
  const { data: objectives, error } = await supabase
    .from('mavf_objectives')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ objectives: objectives || [] });
}

export async function POST(request) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getAuthContext(supabase);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canAccessObjectives(profile)) {
    return NextResponse.json(
      {
        error: 'Recurso exclusivo para membros da Mentoria em Grupo',
        tier_required: 'MOVIMENTO',
        current_tier: profile?.tier || 'DESPERTAR'
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const pillar = String(body?.pillar || '').toLowerCase();
  const description = String(body?.description || '').trim();
  const deadline = String(body?.deadline || '');
  const session_id = body?.session_id || null;

  if (!pillar || !description || !deadline) {
    return NextResponse.json({ error: 'Missing required fields: pillar, description, deadline' }, { status: 400 });
  }

  if (!MAVF_PILLAR_IDS.includes(pillar)) {
    return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 });
  }

  if (description.length < 10) {
    return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 });
  }

  if (!isValidIsoDate(deadline)) {
    return NextResponse.json({ error: 'Deadline must be YYYY-MM-DD' }, { status: 400 });
  }

  if (deadline < todayIsoDate()) {
    return NextResponse.json({ error: 'Deadline cannot be in the past' }, { status: 400 });
  }

  const { data: objective, error } = await supabase
    .from('mavf_objectives')
    .insert({
      user_id: user.id,
      session_id,
      pillar,
      description,
      deadline,
      progress: 0
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ objective }, { status: 201 });
}
