import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { calculatePhase } from '@/src/modules/coins/application/coins-service';

function resolveGainAwardAmount(sizeRaw) {
  const size = String(sizeRaw || '')
    .trim()
    .toLowerCase();

  return size === 'grande' ? 20 : 10;
}

async function revertGainCoins({ supabase, userId, gain }) {
  const awardAmount = resolveGainAwardAmount(gain?.tamanho);

  const { data: currentBalance, error: readError } = await supabase
    .from('coins_balance')
    .select('coins, coins_total')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message || 'Erro ao consultar saldo de coins');
  }

  const currentCoins = Number(currentBalance?.coins || 0);
  const currentTotal = Number(currentBalance?.coins_total || 0);

  const coinsDeduction = Math.min(awardAmount, Math.max(currentCoins, 0));
  const totalDeduction = Math.min(awardAmount, Math.max(currentTotal, 0));

  const nextCoins = Math.max(0, currentCoins - coinsDeduction);
  const nextTotal = Math.max(0, currentTotal - totalDeduction);

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

  if (coinsDeduction > 0) {
    const { error: txError } = await supabase.from('coins_transactions').insert({
      user_id: userId,
      amount: -coinsDeduction,
      action_type: 'gain_removed',
      description: `Estorno por remoção de ganho (${String(gain?.tamanho || 'pequeno')})`,
      metadata: {
        gain_id: gain?.id || null,
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
    amount_reverted: coinsDeduction
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

  const gainId = params?.id;
  if (!gainId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from('gains')
    .select('id,user_id,tamanho')
    .eq('id', gainId)
    .eq('user_id', context.targetUserId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message || 'Erro ao localizar ganho' }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Ganho não encontrado' }, { status: 404 });
  }

  let balance = null;
  try {
    balance = await revertGainCoins({
      supabase,
      userId: context.targetUserId,
      gain: existing
    });
  } catch (revertError) {
    return NextResponse.json({ error: revertError.message || 'Erro ao estornar coins do ganho' }, { status: 500 });
  }

  const { error } = await supabase.from('gains').delete().eq('id', gainId).eq('user_id', context.targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Erro ao remover ganho' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    balance
  });
}
