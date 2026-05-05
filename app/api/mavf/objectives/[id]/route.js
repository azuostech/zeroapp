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

async function getObjectiveById(supabase, id) {
  const { data: objective, error } = await supabase.from('mavf_objectives').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return objective;
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = params;
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

    const objective = await getObjectiveById(supabase, id);
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 });

    const isOwner = objective.user_id === user.id;
    const isAdmin = Boolean(profile?.is_admin);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates = {};

    if (body.description !== undefined) {
      const description = String(body.description || '').trim();
      if (description.length < 10) {
        return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 });
      }
      updates.description = description;
    }

    if (body.deadline !== undefined) {
      const deadline = String(body.deadline || '');
      if (!isValidIsoDate(deadline)) {
        return NextResponse.json({ error: 'Deadline must be YYYY-MM-DD' }, { status: 400 });
      }
      if (deadline < todayIsoDate()) {
        return NextResponse.json({ error: 'Deadline cannot be in the past' }, { status: 400 });
      }
      updates.deadline = deadline;
    }

    if (body.pillar !== undefined) {
      const pillar = String(body.pillar || '').toLowerCase();
      if (!MAVF_PILLAR_IDS.includes(pillar)) {
        return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 });
      }
      updates.pillar = pillar;
    }

    if (body.progress !== undefined) {
      const progress = Number.parseInt(body.progress, 10);
      if (Number.isNaN(progress) || progress < 0 || progress > 100 || progress % 5 !== 0) {
        return NextResponse.json({ error: 'Progress must be between 0 and 100, with step 5' }, { status: 400 });
      }
      updates.progress = progress;
    }

    if (!isOwner && isAdmin) {
      const allowedForAdmin = new Set(['progress']);
      const invalidAdminFields = Object.keys(updates).filter((field) => !allowedForAdmin.has(field));
      if (invalidAdminFields.length) {
        return NextResponse.json({ error: 'Admin can only update progress for other users' }, { status: 403 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    let query = supabase.from('mavf_objectives').update(updates).eq('id', id);
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: updated, error: updateError } = await query.select().maybeSingle();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json({ objective: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = params;
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

    const objective = await getObjectiveById(supabase, id);
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 });

    if (objective.user_id !== user.id) {
      return NextResponse.json({ error: 'Only owner can delete objective' }, { status: 403 });
    }

    const { error } = await supabase.from('mavf_objectives').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}
