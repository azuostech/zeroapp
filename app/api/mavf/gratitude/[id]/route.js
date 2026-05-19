import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { calculatePhase } from '@/src/modules/coins/application/coins-service';

async function revertGratitudeCoins({ supabase, userId, entryId }) {
  const { data: reversalTx, error: reversalError } = await supabase
    .from('coins_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('action_type', 'gratitude_removed')
    .contains('metadata', { entry_id: entryId })
    .limit(1)
    .maybeSingle();

  if (reversalError) {
    throw new Error(reversalError.message || 'Erro ao verificar estorno anterior');
  }

  const { data: currentBalance, error: readBalanceError } = await supabase
    .from('coins_balance')
    .select('coins, coins_total')
    .eq('user_id', userId)
    .maybeSingle();

  if (readBalanceError) {
    throw new Error(readBalanceError.message || 'Erro ao consultar saldo de coins');
  }

  const currentCoins = Number(currentBalance?.coins || 0);
  const currentTotal = Number(currentBalance?.coins_total || 0);

  if (reversalTx) {
    return {
      coins: currentCoins,
      coins_total: currentTotal,
      phase: calculatePhase(currentTotal).phase,
      amount_reverted: 0
    };
  }

  const { data: awardTx, error: awardError } = await supabase
    .from('coins_transactions')
    .select('id,amount')
    .eq('user_id', userId)
    .eq('action_type', 'gratitude_registered')
    .contains('metadata', { entry_id: entryId })
    .gt('amount', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (awardError) {
    throw new Error(awardError.message || 'Erro ao consultar transação de crédito');
  }

  const creditedAmount = Number(awardTx?.amount || 0);
  const amountToRevert = Math.max(0, Math.min(creditedAmount, currentCoins, currentTotal));
  const nextCoins = Math.max(0, currentCoins - amountToRevert);
  const nextTotal = Math.max(0, currentTotal - amountToRevert);

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

  if (amountToRevert > 0) {
    const { error: txError } = await supabase.from('coins_transactions').insert({
      user_id: userId,
      amount: -amountToRevert,
      action_type: 'gratitude_removed',
      description: 'Estorno por remoção de gratidão',
      metadata: {
        entry_id: entryId,
        original_transaction_id: awardTx?.id || null,
        source: 'mavf_praticas'
      }
    });

    if (txError) {
      throw new Error(txError.message || 'Erro ao registrar estorno de coins');
    }
  }

  return {
    coins: nextCoins,
    coins_total: nextTotal,
    phase: calculatePhase(nextTotal).phase,
    amount_reverted: amountToRevert
  };
}

export async function DELETE(request, { params }) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('user_id');

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const entryId = params?.id;
  if (!entryId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from('gratitude_entries')
    .select('id,user_id')
    .eq('id', entryId)
    .eq('user_id', context.targetUserId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message || 'Erro ao localizar registro' }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
  }

  let balance = null;
  try {
    balance = await revertGratitudeCoins({
      supabase,
      userId: context.targetUserId,
      entryId
    });
  } catch (revertError) {
    return NextResponse.json({ error: revertError.message || 'Erro ao estornar coins' }, { status: 500 });
  }

  const { error } = await supabase
    .from('gratitude_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', context.targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Erro ao remover registro' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    balance
  });
}
