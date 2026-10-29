import { getServiceSupabase } from '@/src/lib/supabase/service';
import { DEFAULT_COINS_ACTION_AMOUNTS } from '@/src/modules/coins/application/coins-service';
import { COINS } from '@/src/modules/patrimony/domain/patrimony.constants';
import { isDebtEligibleForClearedCoins as evaluateClearedEligibility } from './patrimony-coins-policy';

const balance = (data) => { const row = Array.isArray(data) ? data[0] : data; return row ? { coins: row.new_coins, coins_total: row.new_total, phase: row.new_phase } : null; };
async function claimAndAward({ debtId, userId, column, amount, action, description }) {
  const service = getServiceSupabase(); const now = new Date().toISOString();
  const { data: claimed } = await service.from('patrimony_debts').update({ [column]: now }).eq('id', debtId).eq('user_id', userId).is(column, null).select('id').maybeSingle();
  if (!claimed) return { awarded: false, reason: 'already_awarded' };
  const { data, error } = await service.rpc('award_coins', { p_user_id: userId, p_amount: amount, p_action_type: action, p_description: description, p_metadata: { debt_id: debtId, source: 'patrimonio' } });
  if (error) { await service.from('patrimony_debts').update({ [column]: null }).eq('id', debtId).eq('user_id', userId).eq(column, now); return { awarded: false, reason: 'rpc_failed' }; }
  return { awarded: true, amount, balance: balance(data) };
}
export async function awardDebtMapped({ debtId, userId }) { const service = getServiceSupabase(); const { count } = await service.from('coins_transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('action_type', COINS.DEBT_MAPPED_ACTION); if ((count || 0) >= COINS.DEBT_MAPPED_LIFETIME_CAP) return { awarded: false, reason: 'cap_reached' }; return claimAndAward({ debtId, userId, column: 'coins_mapped_awarded_at', amount: COINS.DEBT_MAPPED_AMOUNT, action: COINS.DEBT_MAPPED_ACTION, description: 'Dívida mapeada' }); }
export function isDebtEligibleForClearedCoins({ debt, actorRole, now = Date.now() }) {
  return evaluateClearedEligibility({ debt, actorRole, now, minimumAgeDays: COINS.DEBT_CLEARED_MIN_AGE_DAYS });
}
export async function awardDebtCleared({ debt, userId, actorRole }) { if (!isDebtEligibleForClearedCoins({ debt, actorRole })) return { awarded: false, reason: 'too_recent' }; return claimAndAward({ debtId: debt.id, userId, column: 'coins_cleared_awarded_at', amount: DEFAULT_COINS_ACTION_AMOUNTS.debt_cleared, action: COINS.DEBT_CLEARED_ACTION, description: 'Dívida quitada' }); }
