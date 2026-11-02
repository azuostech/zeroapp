import { getServiceSupabase } from '../../../lib/supabase/service';

const descriptions = { investment_first: 'Primeiro investimento', investment_month: 'Aporte do mês', reserve_month_reached: 'Mês de Reserva de Liquidez' };
const balance = (data) => { const row = Array.isArray(data) ? data[0] : data; return row ? { coins: row.new_coins, coins_total: row.new_total, phase: row.new_phase } : null; };

export async function awardInvestmentClaims({ userId, claims = [], service = getServiceSupabase() }) {
  const awarded = []; let currentBalance = null;
  for (const claim of claims) {
    const inserted = await service.from('investment_coin_claims').upsert({ user_id: userId, claim_key: claim.key, action_type: claim.action }, { onConflict: 'user_id,claim_key', ignoreDuplicates: true }).select('claim_key').maybeSingle();
    if (inserted.error) throw new Error(inserted.error.message);
    if (!inserted.data) continue;
    const rpc = await service.rpc('award_coins', { p_user_id: userId, p_amount: claim.amount, p_action_type: claim.action, p_description: descriptions[claim.action] || 'Investimentos', p_metadata: { claim_key: claim.key, source: 'investimentos' } });
    if (rpc.error) { await service.from('investment_coin_claims').delete().eq('user_id', userId).eq('claim_key', claim.key); continue; }
    awarded.push({ ...claim }); currentBalance = balance(rpc.data);
  }
  return { awarded, balance: currentBalance };
}
