import { calculatePhase } from '@/src/modules/coins/application/coins-service';

function toPositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function awardMavfCoinsWithSession({
  supabase,
  userId,
  amount,
  actionType,
  description,
  metadata
}) {
  const safeAmount = toPositiveInteger(amount);
  if (!safeAmount) {
    throw new Error('invalid_award_amount');
  }

  const { data: currentBalance, error: currentBalanceError } = await supabase
    .from('coins_balance')
    .select('coins, coins_total')
    .eq('user_id', userId)
    .maybeSingle();

  if (currentBalanceError) {
    throw new Error(currentBalanceError.message || 'Erro ao consultar saldo atual de coins');
  }

  const nextCoins = Number(currentBalance?.coins || 0) + safeAmount;
  const nextTotal = Number(currentBalance?.coins_total || 0) + safeAmount;

  const { error: upsertError } = await supabase.from('coins_balance').upsert(
    {
      user_id: userId,
      coins: nextCoins,
      coins_total: nextTotal,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    throw new Error(upsertError.message || 'Erro ao atualizar saldo de coins');
  }

  const { error: txError } = await supabase.from('coins_transactions').insert({
    user_id: userId,
    amount: safeAmount,
    action_type: actionType,
    description,
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
  });

  if (txError) {
    throw new Error(txError.message || 'Erro ao registrar transação de coins');
  }

  return {
    coins: nextCoins,
    coins_total: nextTotal,
    phase: calculatePhase(nextTotal).phase
  };
}
