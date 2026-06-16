import { roundMoney, toNumber } from '@/src/lib/shamar/api';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function startOfUtcWeek(date) {
  const normalized = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized;
}

function weekKey(value) {
  return startOfUtcWeek(toDate(value)).toISOString().slice(0, 10);
}

function elapsedWeeks(start, end) {
  const startWeek = startOfUtcWeek(start);
  const endWeek = startOfUtcWeek(end);
  return Math.max(1, Math.floor((endWeek.getTime() - startWeek.getTime()) / WEEK_MS) + 1);
}

function currentWeeklyStreak(weekKeys, endDate) {
  const weeks = new Set(weekKeys);
  let cursor = startOfUtcWeek(endDate);
  let streak = 0;

  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - WEEK_MS);
  }

  return streak;
}

function resolveIdentityLevel(indexTotal, seasonStatus) {
  if (indexTotal >= 900 && seasonStatus === 'completed') return 'legado';
  if (indexTotal >= 700) return 'multiplicador';
  if (indexTotal >= 450) return 'cultivador';
  if (indexTotal >= 200) return 'construtor';
  return 'guardiao';
}

async function loadSeasonBundle(supabase, userId, seasonId) {
  const { data: season, error: seasonError } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status,patrimonio_inicial,patrimonio_final,started_at,ended_at')
    .eq('id', seasonId)
    .eq('user_id', userId)
    .maybeSingle();

  if (seasonError) throw new Error(seasonError.message || 'shamar_season_lookup_failed');
  if (!season) throw new Error('shamar_season_not_found');

  const { data: config, error: configError } = await supabase
    .from('shamar_tribo_configs')
    .select('id,turma,meta_total,duration_days,started_at,ends_at')
    .eq('id', season.tribo_config_id)
    .maybeSingle();

  if (configError) throw new Error(configError.message || 'shamar_config_lookup_failed');
  if (!config) throw new Error('shamar_config_not_found');

  return { season, config };
}

async function loadContributionStats(supabase, seasonId) {
  const { data, error } = await supabase
    .from('shamar_contributions')
    .select('id,amount,contributed_at')
    .eq('season_id', seasonId)
    .order('contributed_at', { ascending: true });

  if (error) throw new Error(error.message || 'shamar_contributions_lookup_failed');

  const contributions = data || [];
  const amountTotal = roundMoney(contributions.reduce((sum, row) => sum + toNumber(row.amount), 0));
  const contributionWeeks = contributions.map((row) => weekKey(row.contributed_at));

  return {
    contributions,
    amountTotal,
    contributionWeeks: [...new Set(contributionWeeks)]
  };
}

async function loadBoardStats(supabase, season) {
  const [{ data: squares, error: squaresError }, { data: marked, error: markedError }] = await Promise.all([
    supabase
      .from('shamar_board_squares')
      .select('id,value')
      .eq('tribo_config_id', season.tribo_config_id),
    supabase
      .from('shamar_marked_squares')
      .select('square_id')
      .eq('season_id', season.id)
  ]);

  if (squaresError) throw new Error(squaresError.message || 'shamar_board_lookup_failed');
  if (markedError) throw new Error(markedError.message || 'shamar_marked_lookup_failed');

  return {
    totalSquares: (squares || []).length,
    markedSquares: (marked || []).length,
    totalBoardValue: roundMoney((squares || []).reduce((sum, row) => sum + toNumber(row.value), 0))
  };
}

async function loadParticipationStats(supabase, season) {
  const { data: balance, error: balanceError } = await supabase
    .from('shamar_points_balance')
    .select('points_total')
    .eq('season_id', season.id)
    .eq('user_id', season.user_id)
    .maybeSingle();

  if (balanceError) throw new Error(balanceError.message || 'shamar_points_lookup_failed');

  const { data: missions, error: missionsError } = await supabase
    .from('shamar_turma_missions')
    .select('custom_points,shamar_missions(points_reward)')
    .eq('tribo_config_id', season.tribo_config_id)
    .eq('is_active', true);

  const missionMax = missionsError
    ? 0
    : (missions || []).reduce((sum, row) => {
        const customPoints = row.custom_points === null || row.custom_points === undefined
          ? null
          : toNumber(row.custom_points);
        const defaultPoints = toNumber(row.shamar_missions?.points_reward);
        return sum + (customPoints ?? defaultPoints);
      }, 0);

  return {
    pointsTotal: toNumber(balance?.points_total),
    maxPossiblePoints: Math.max(1000, missionMax + 50)
  };
}

function calculateScores({ season, config, contributionStats, boardStats, participationStats }) {
  const now = new Date();
  const seasonStart = toDate(season.started_at || config.started_at, now);
  const configEnd = toDate(config.ends_at, now);
  const endForProgress = new Date(Math.min(now.getTime(), configEnd.getTime()));
  const totalElapsedWeeks = elapsedWeeks(seasonStart, endForProgress);
  const weeksWithContribution = contributionStats.contributionWeeks.length;
  const streak = currentWeeklyStreak(contributionStats.contributionWeeks, endForProgress);

  const constanciaRatio = Math.min(1, weeksWithContribution / totalElapsedWeeks);
  const streakBonus = Math.min(0.15, streak * 0.03);
  const scoreConstancia = Math.round(Math.min(1, constanciaRatio * 0.85 + streakBonus) * 600);

  const scoreEvolucao = boardStats.totalSquares > 0
    ? Math.round(Math.min(1, boardStats.markedSquares / boardStats.totalSquares) * 200)
    : 0;

  const metaTotal = toNumber(config.meta_total);
  const patrimonioTotal = contributionStats.amountTotal;
  const scorePatrimonio = metaTotal > 0
    ? Math.round(Math.min(1, patrimonioTotal / metaTotal) * 100)
    : 0;

  const scoreParticipacao = participationStats.maxPossiblePoints > 0
    ? Math.round(Math.min(1, participationStats.pointsTotal / participationStats.maxPossiblePoints) * 100)
    : 0;

  const indexTotal = Math.min(
    1000,
    scoreConstancia + scoreEvolucao + scorePatrimonio + scoreParticipacao
  );

  return {
    index_total: indexTotal,
    score_constancia: scoreConstancia,
    score_evolucao: scoreEvolucao,
    score_patrimonio: scorePatrimonio,
    score_participacao: scoreParticipacao,
    identity_level: resolveIdentityLevel(indexTotal, season.status),
    details: {
      weeks_elapsed: totalElapsedWeeks,
      weeks_with_contribution: weeksWithContribution,
      current_streak_weeks: streak,
      marked_squares: boardStats.markedSquares,
      total_squares: boardStats.totalSquares,
      patrimonio_total: patrimonioTotal,
      meta_total: metaTotal,
      shamar_points_total: participationStats.pointsTotal,
      max_possible_points: participationStats.maxPossiblePoints
    }
  };
}

export async function calculateAndPersistShamarIndex({ supabase, userId, seasonId }) {
  const { season, config } = await loadSeasonBundle(supabase, userId, seasonId);
  const [contributionStats, boardStats, participationStats] = await Promise.all([
    loadContributionStats(supabase, season.id),
    loadBoardStats(supabase, season),
    loadParticipationStats(supabase, season)
  ]);

  const scores = calculateScores({
    season,
    config,
    contributionStats,
    boardStats,
    participationStats
  });

  const record = {
    user_id: userId,
    season_id: season.id,
    calculated_at: todayIsoDate(),
    index_total: scores.index_total,
    score_constancia: scores.score_constancia,
    score_evolucao: scores.score_evolucao,
    score_patrimonio: scores.score_patrimonio,
    score_participacao: scores.score_participacao,
    identity_level: scores.identity_level
  };

  const { data: indexRecord, error: indexError } = await supabase
    .from('shamar_index_history')
    .upsert(record, { onConflict: 'user_id,season_id,calculated_at' })
    .select('*')
    .single();

  if (indexError) throw new Error(indexError.message || 'shamar_index_upsert_failed');

  const { error: updateError } = await supabase
    .from('shamar_seasons')
    .update({ identity_level: scores.identity_level })
    .eq('id', season.id)
    .eq('user_id', userId);

  if (updateError) throw new Error(updateError.message || 'shamar_identity_update_failed');

  return {
    index: indexRecord,
    identity_level: scores.identity_level,
    details: scores.details
  };
}
