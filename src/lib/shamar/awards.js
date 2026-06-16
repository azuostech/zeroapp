import { getServiceSupabase } from '@/src/lib/supabase/service';
import { calculatePhase } from '@/src/modules/coins/application/coins-service';

function parseRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

export async function awardZeroCoinsSafely({ userId, amount, actionType, description, metadata }) {
  try {
    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase.rpc('award_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_action_type: actionType,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) throw new Error(error.message || 'award_coins_failed');

    const row = parseRpcRow(data);
    return {
      awarded: true,
      warning: null,
      balance: {
        coins: Number(row?.new_coins || 0),
        coins_total: Number(row?.new_total || 0),
        phase: String(row?.new_phase || calculatePhase(Number(row?.new_total || 0)).phase)
      }
    };
  } catch (error) {
    return {
      awarded: false,
      warning: error?.message || 'award_coins_failed',
      balance: null
    };
  }
}

export async function awardShamarPointsSafely({ userId, seasonId, amount, sourceType, sourceId, description }) {
  try {
    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase.rpc('award_shamar_points', {
      p_user_id: userId,
      p_season_id: seasonId,
      p_amount: amount,
      p_source_type: sourceType,
      p_source_id: sourceId || null,
      p_description: description || null
    });

    if (error) throw new Error(error.message || 'award_shamar_points_failed');

    return {
      awarded: true,
      warning: null,
      points_total: Number(data || 0)
    };
  } catch (error) {
    return {
      awarded: false,
      warning: error?.message || 'award_shamar_points_failed',
      points_total: null
    };
  }
}
