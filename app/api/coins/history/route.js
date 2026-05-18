import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { getCoinsBalance, getCoinsHistory } from '@/src/modules/coins/application/coins-service';
import { getProgressInfo } from '@/src/modules/coins/domain/jornada-phases';

export async function GET(request) {
  const limitParam = request.nextUrl.searchParams.get('limit') || '20';
  const limit = Number.parseInt(limitParam, 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      {
        error: 'invalid_limit',
        details: 'limit deve ser entre 1 e 100'
      },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const [history, balance] = await Promise.all([
      getCoinsHistory({
        supabase,
        userId: user.id,
        limit
      }),
      getCoinsBalance({
        supabase,
        userId: user.id
      })
    ]);

    const coins = Number(balance?.coins || 0);
    const coinsTotal = Number(balance?.coins_total || 0);
    const progress = getProgressInfo(coinsTotal);

    return NextResponse.json({
      // Compatibilidade com consumidores antigos.
      data: history,
      balance: {
        coins,
        coins_total: coinsTotal
      },
      transactions: history,
      fase_atual: {
        id: progress.faseAtual.id,
        emoji: progress.faseAtual.emoji,
        nome: progress.faseAtual.nome,
        phase: progress.faseAtual.phase,
        progresso_pct: progress.progressoPct,
        coins_para_proxima: progress.coinsParaProxima
      },
      proxima_fase: progress.proximaFase
        ? {
            id: progress.proximaFase.id,
            emoji: progress.proximaFase.emoji,
            nome: progress.proximaFase.nome,
            phase: progress.proximaFase.phase
          }
        : null
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
