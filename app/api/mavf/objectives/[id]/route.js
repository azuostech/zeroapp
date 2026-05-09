import { createServerSupabase } from '@/src/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MAVF_ALLOWED_TIERS, MAVF_PILLAR_IDS } from '@/lib/mavf-config';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function canAccessObjectives(profile) {
  return Boolean(profile?.is_admin || profile?.role === 'admin') || MAVF_ALLOWED_TIERS.includes(profile?.tier);
}

function normalizeObjectivesError(error) {
  const message = error?.message || '';
  if (error?.code === 'PGRST205' || message.includes("Could not find the table 'public.mavf_objectives'")) {
    return 'Tabela mavf_objectives não encontrada. Execute o arquivo mavf-objectives.sql no Supabase SQL Editor.';
  }
  return message || 'Erro interno ao processar objetivos.';
}

async function getObjectiveById(supabase, id) {
  const { data: objective, error } = await supabase.from('mavf_objectives').select('*').eq('id', id).maybeSingle();
  if (error) {
    const enriched = new Error(normalizeObjectivesError(error));
    enriched.code = error.code;
    throw enriched;
  }
  return objective;
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = params;
    const context = await resolveImpersonationContext({
      supabase,
      requestedUserId: null
    });

    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    if (!canAccessObjectives(context.profile)) {
      return NextResponse.json(
        {
          error: 'Recurso exclusivo para membros da Mentoria em Grupo',
          tier_required: 'MOVIMENTO',
          current_tier: context.profile?.tier || 'DESPERTAR'
        },
        { status: 403 }
      );
    }

    const objective = await getObjectiveById(supabase, id);
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 });

    const isOwner = objective.user_id === context.user.id;
    const isAdmin = Boolean(context.isAdmin);
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    let query = supabase.from('mavf_objectives').update(updates).eq('id', id);
    if (!isAdmin) {
      query = query.eq('user_id', context.user.id);
    }

    const { data: updated, error: updateError } = await query.select().maybeSingle();
    if (updateError) {
      return NextResponse.json({ error: normalizeObjectivesError(updateError) }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    if (!isOwner && isAdmin) {
      await recordAdminAudit({
        supabase,
        adminUserId: context.user.id,
        targetUserId: objective.user_id,
        action: 'update',
        resource: 'mavf_objective',
        resourceId: id,
        metadata: updates
      });
    }

    return NextResponse.json({ objective: updated });
  } catch (error) {
    return NextResponse.json({ error: normalizeObjectivesError(error) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = params;
    const context = await resolveImpersonationContext({
      supabase,
      requestedUserId: null
    });

    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    if (!canAccessObjectives(context.profile)) {
      return NextResponse.json(
        {
          error: 'Recurso exclusivo para membros da Mentoria em Grupo',
          tier_required: 'MOVIMENTO',
          current_tier: context.profile?.tier || 'DESPERTAR'
        },
        { status: 403 }
      );
    }

    const objective = await getObjectiveById(supabase, id);
    if (!objective) return NextResponse.json({ error: 'Objective not found' }, { status: 404 });

    const isOwner = objective.user_id === context.user.id;
    const isAdmin = Boolean(context.isAdmin);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only owner or admin can delete objective' }, { status: 403 });
    }

    let query = supabase.from('mavf_objectives').delete().eq('id', id);
    if (!isAdmin) {
      query = query.eq('user_id', context.user.id);
    }
    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: normalizeObjectivesError(error) }, { status: 500 });
    }

    if (!isOwner && isAdmin) {
      await recordAdminAudit({
        supabase,
        adminUserId: context.user.id,
        targetUserId: objective.user_id,
        action: 'delete',
        resource: 'mavf_objective',
        resourceId: id,
        metadata: {
          pillar: objective.pillar,
          session_id: objective.session_id || null
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: normalizeObjectivesError(error) }, { status: 500 });
  }
}
