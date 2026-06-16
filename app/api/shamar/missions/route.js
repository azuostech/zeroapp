import { NextResponse } from 'next/server';
import {
  createAuthenticatedContext,
  normalizeId,
  resolveShamarDbError,
  toNumber
} from '@/src/lib/shamar/api';

function missionIcon(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('aporte')) return '💰';
  if (normalized.includes('streak')) return '🔥';
  if (normalized.includes('planning')) return '📋';
  if (normalized.includes('prestacao')) return '👥';
  if (normalized.includes('closing')) return '🏁';
  return '🎯';
}

function progressForMission(type, stats, completed) {
  if (completed) return 100;
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('first_aporte')) return stats.contributions_count > 0 ? 100 : 0;
  if (normalized.includes('weekly_aporte')) return stats.current_week_contributions > 0 ? 75 : 0;
  if (normalized.includes('streak_8')) return Math.min(99, Math.round((stats.current_streak_weeks / 8) * 100));
  if (normalized.includes('streak_4')) return Math.min(99, Math.round((stats.current_streak_weeks / 4) * 100));
  return 0;
}

function weekKey(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized.toISOString().slice(0, 10);
}

function currentStreakWeeks(contributions) {
  const weeks = new Set((contributions || []).map((item) => weekKey(item.contributed_at)).filter(Boolean));
  let cursor = weekKey(new Date().toISOString());
  let streak = 0;

  while (weeks.has(cursor)) {
    streak += 1;
    const date = new Date(`${cursor}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 7);
    cursor = date.toISOString().slice(0, 10);
  }

  return streak;
}

async function resolveSeason(supabase, userId, seasonId) {
  let query = supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status')
    .eq('user_id', userId);

  if (seasonId) query = query.eq('id', seasonId);
  else query = query.eq('status', 'active').order('started_at', { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) return { season: null, error };
  return { season: data || null, error: null };
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const requestedSeasonId = normalizeId(searchParams.get('season_id'));
  const { season, error: seasonError } = await resolveSeason(context.supabase, context.user.id, requestedSeasonId);

  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }

  if (!season) {
    return NextResponse.json({ missions: [], completed: [], stats: { completed: 0, active: 0, points_earned: 0 } });
  }

  const [missionsResult, completionsResult, contributionsResult, pointsResult] = await Promise.all([
    context.supabase
      .from('shamar_turma_missions')
      .select('id,due_date,custom_points,is_active,shamar_missions(id,title,description,mission_type,points_reward,recurrence)')
      .eq('tribo_config_id', season.tribo_config_id)
      .eq('is_active', true)
      .order('activated_at', { ascending: true }),
    context.supabase
      .from('shamar_mission_completions')
      .select('id,turma_mission_id,completed_at')
      .eq('season_id', season.id)
      .eq('user_id', context.user.id),
    context.supabase
      .from('shamar_contributions')
      .select('id,contributed_at')
      .eq('season_id', season.id)
      .eq('user_id', context.user.id),
    context.supabase
      .from('shamar_points_balance')
      .select('points_total')
      .eq('season_id', season.id)
      .eq('user_id', context.user.id)
      .maybeSingle()
  ]);

  const firstError = [missionsResult.error, completionsResult.error, contributionsResult.error, pointsResult.error].find(Boolean);
  if (firstError) {
    return NextResponse.json({ error: resolveShamarDbError(firstError, 'shamar_missions_lookup_failed') }, { status: 500 });
  }

  const completionsByMission = new Map((completionsResult.data || []).map((item) => [item.turma_mission_id, item]));
  const currentWeek = weekKey(new Date().toISOString());
  const contributionStats = {
    contributions_count: (contributionsResult.data || []).length,
    current_week_contributions: (contributionsResult.data || []).filter((item) => weekKey(item.contributed_at) === currentWeek).length,
    current_streak_weeks: currentStreakWeeks(contributionsResult.data || [])
  };

  const missions = (missionsResult.data || []).map((item) => {
    const mission = item.shamar_missions || {};
    const completed = completionsByMission.get(item.id) || null;
    const points = item.custom_points === null || item.custom_points === undefined
      ? toNumber(mission.points_reward)
      : toNumber(item.custom_points);

    return {
      id: item.id,
      mission_id: mission.id,
      title: mission.title || 'Missao SHAMAR',
      description: mission.description || '',
      mission_type: mission.mission_type || '',
      recurrence: mission.recurrence || 'once',
      due_date: item.due_date || null,
      points_reward: points,
      completed: Boolean(completed),
      completed_at: completed?.completed_at || null,
      progress_pct: progressForMission(mission.mission_type, contributionStats, Boolean(completed)),
      icon: missionIcon(mission.mission_type)
    };
  });

  return NextResponse.json({
    season_id: season.id,
    missions,
    completed: completionsResult.data || [],
    stats: {
      completed: missions.filter((mission) => mission.completed).length,
      active: missions.filter((mission) => !mission.completed).length,
      points_earned: toNumber(pointsResult.data?.points_total)
    }
  });
}
