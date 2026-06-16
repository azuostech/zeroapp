import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { createAdminContext, normalizeId, parseJsonBody, resolveShamarDbError, toNumber } from '@/src/lib/shamar/api';

function writerClient(fallback) {
  try {
    return getServiceSupabase();
  } catch (_) {
    return fallback;
  }
}

function normalizeDueDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:59.000Z`) : new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeCustomPoints(value) {
  if (value === undefined || value === null || value === '') return null;
  const points = Number(value);
  if (!Number.isInteger(points) || points < 0) return undefined;
  return points;
}

function mergeMissions(missions, turmaMissions) {
  const byMissionId = new Map((turmaMissions || []).map((item) => [item.mission_id, item]));

  return (missions || []).map((mission) => {
    const turmaMission = byMissionId.get(mission.id) || null;
    const customPoints = turmaMission?.custom_points;
    const points = customPoints === null || customPoints === undefined
      ? toNumber(mission.points_reward)
      : toNumber(customPoints);

    return {
      id: turmaMission?.id || null,
      mission_id: mission.id,
      title: mission.title,
      description: mission.description,
      mission_type: mission.mission_type,
      recurrence: mission.recurrence,
      default_points: toNumber(mission.points_reward),
      custom_points: customPoints ?? null,
      points_reward: points,
      due_date: turmaMission?.due_date || null,
      is_active: Boolean(turmaMission?.is_active),
      activated_at: turmaMission?.activated_at || null
    };
  });
}

async function loadMissionBundle(supabase, triboConfigId) {
  const [configResult, missionsResult, turmaMissionsResult] = await Promise.all([
    supabase
      .from('shamar_tribo_configs')
      .select('id,turma,meta_total,duration_days,started_at,ends_at,is_active')
      .eq('id', triboConfigId)
      .maybeSingle(),
    supabase
      .from('shamar_missions')
      .select('id,title,description,mission_type,points_reward,recurrence,is_active,created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('shamar_turma_missions')
      .select('id,tribo_config_id,mission_id,is_active,due_date,custom_points,activated_at')
      .eq('tribo_config_id', triboConfigId)
  ]);

  const firstError = [configResult.error, missionsResult.error, turmaMissionsResult.error].find(Boolean);
  if (firstError) throw firstError;
  if (!configResult.data) {
    const err = new Error('config_nao_encontrada');
    err.status = 404;
    throw err;
  }

  return {
    config: configResult.data,
    missions: mergeMissions(missionsResult.data || [], turmaMissionsResult.data || [])
  };
}

export async function GET(_request, { params }) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const triboConfigId = normalizeId(params?.triboConfigId);
  if (!triboConfigId) return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });

  const supabase = writerClient(context.supabase);

  try {
    const bundle = await loadMissionBundle(supabase, triboConfigId);
    return NextResponse.json(bundle);
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_missions_admin_lookup_failed') }, { status });
  }
}

export async function PATCH(request, { params }) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const triboConfigId = normalizeId(params?.triboConfigId);
  if (!triboConfigId) return NextResponse.json({ error: 'tribo_config_id_obrigatorio' }, { status: 422 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const missionId = normalizeId(parsed.body?.mission_id);
  const isActive = parsed.body?.is_active;
  const dueDate = normalizeDueDate(parsed.body?.due_date);
  const customPoints = normalizeCustomPoints(parsed.body?.custom_points);

  if (!missionId) return NextResponse.json({ error: 'mission_id_obrigatorio' }, { status: 422 });
  if (typeof isActive !== 'boolean') return NextResponse.json({ error: 'is_active_invalido' }, { status: 422 });
  if (dueDate === undefined) return NextResponse.json({ error: 'due_date_invalida' }, { status: 422 });
  if (customPoints === undefined) return NextResponse.json({ error: 'custom_points_invalido' }, { status: 422 });

  const supabase = writerClient(context.supabase);

  const { data: mission, error: missionError } = await supabase
    .from('shamar_missions')
    .select('id')
    .eq('id', missionId)
    .eq('is_active', true)
    .maybeSingle();

  if (missionError) {
    return NextResponse.json({ error: resolveShamarDbError(missionError, 'shamar_mission_lookup_failed') }, { status: 500 });
  }

  if (!mission) return NextResponse.json({ error: 'missao_nao_encontrada' }, { status: 404 });

  const { data, error } = await supabase
    .from('shamar_turma_missions')
    .upsert(
      {
        tribo_config_id: triboConfigId,
        mission_id: missionId,
        is_active: isActive,
        due_date: dueDate,
        custom_points: customPoints
      },
      { onConflict: 'tribo_config_id,mission_id' }
    )
    .select('id,tribo_config_id,mission_id,is_active,due_date,custom_points,activated_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_turma_mission_update_failed') }, { status: 500 });
  }

  await recordAdminAudit({
    supabase: context.supabase,
    adminUserId: context.user.id,
    targetUserId: context.user.id,
    action: isActive ? 'activate' : 'deactivate',
    resource: 'shamar_turma_mission',
    resourceId: data.id,
    metadata: {
      tribo_config_id: triboConfigId,
      mission_id: missionId,
      due_date: dueDate,
      custom_points: customPoints
    }
  });

  try {
    const bundle = await loadMissionBundle(supabase, triboConfigId);
    return NextResponse.json({ turma_mission: data, ...bundle });
  } catch (_) {
    return NextResponse.json({ turma_mission: data });
  }
}
