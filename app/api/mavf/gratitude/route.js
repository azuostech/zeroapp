import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { calculateStreak } from '@/src/modules/mavf/application/practices-utils';
import { awardMavfCoinsWithSession } from '@/src/modules/mavf/application/mavf-coins-award';
import { publishFeedEvent } from '@/src/modules/community/application/feed-publisher';

const VALID_CATEGORIES = ['financeiro', 'crescimento', 'relacionamentos', 'saude', 'outro'];

function resolveDbErrorMessage(error, fallbackMessage) {
  const code = String(error?.code || '').trim();

  if (code === '42P01') {
    return 'Tabela public.gratitude_entries não encontrada. Execute scripts/migrate-etapa3-mavf-praticas.sql no SQL Editor do Supabase.';
  }

  if (code === '42501') {
    return 'Sem permissão para acessar gratidão. Verifique autenticação e políticas RLS.';
  }

  return error?.message || fallbackMessage;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolveStreakAward(streak) {
  if (streak === 30) {
    return {
      amount: 160,
      description: '+160 🪙 30 dias seguidos de gratidão! 💎'
    };
  }

  if (streak === 7) {
    return {
      amount: 60,
      description: '+60 🪙 7 dias seguidos de gratidão! 🔥'
    };
  }

  return {
    amount: 10,
    description: '+10 🪙 Gratidão registrada'
  };
}

async function fetchEntriesForStreak(supabase, userId) {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) {
    throw new Error(error.message || 'Erro ao consultar streak');
  }

  return data || [];
}

export async function GET(request) {
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

  const { data, count, error } = await supabase
    .from('gratitude_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', context.targetUserId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: resolveDbErrorMessage(error, 'Erro ao carregar gratidão') }, { status: 500 });
  }

  let streak = 0;

  try {
    const streakEntries = await fetchEntriesForStreak(supabase, context.targetUserId);
    streak = calculateStreak(streakEntries);
  } catch (_) {
    streak = calculateStreak(data || []);
  }

  return NextResponse.json({
    entries: data || [],
    stats: {
      total: Number(count || 0),
      streak
    }
  });
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabase();

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const context = await resolveImpersonationContext({
      supabase,
      requestedUserId: body?.user_id
    });

    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const descricao = normalizeText(body?.descricao);
    const categoria = normalizeCategory(body?.categoria);

    if (!descricao) {
      return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 422 });
    }

    if (!VALID_CATEGORIES.includes(categoria)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 422 });
    }

    const { data: entry, error } = await supabase
      .from('gratitude_entries')
      .insert({
        user_id: context.targetUserId,
        descricao,
        categoria
      })
      .select('*')
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: resolveDbErrorMessage(error, 'Erro ao registrar gratidão') }, { status: 500 });
    }

    let streak = 0;

    try {
      const entriesForStreak = await fetchEntriesForStreak(supabase, context.targetUserId);
      streak = calculateStreak(entriesForStreak);
    } catch (_) {
      streak = 1;
    }

    if (streak === 7 || streak === 30) {
      await publishFeedEvent(supabase, {
        userId: context.targetUserId,
        eventType: `gratitude_streak_${streak}`,
        title: `${streak} dias seguidos de gratidao! 🔥`,
        body: null,
        metadata: { streak }
      });
    }

    const award = resolveStreakAward(streak);
    let awardWarning = null;
    let coinsAwarded = {
      amount: award.amount,
      descricao: award.description
    };
    let balance = null;

    try {
      const serviceSupabase = getServiceSupabase();
      const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('award_coins', {
        p_user_id: context.targetUserId,
        p_amount: award.amount,
        p_action_type: 'gratitude_registered',
        p_description: `Gratidão: ${categoria}`,
        p_metadata: {
          entry_id: entry.id,
          categoria,
          streak,
          source: 'mavf_praticas'
        }
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Erro ao conceder coins');
      }

      const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      balance = {
        coins: Number(rpcRow?.new_coins || 0),
        coins_total: Number(rpcRow?.new_total || 0),
        phase: String(rpcRow?.new_phase || 'BOMBEIRO')
      };
    } catch (awardError) {
      try {
        const fallbackBalance = await awardMavfCoinsWithSession({
          supabase,
          userId: context.targetUserId,
          amount: award.amount,
          actionType: 'gratitude_registered',
          description: `Gratidão: ${categoria}`,
          metadata: {
            entry_id: entry.id,
            categoria,
            streak,
            source: 'mavf_praticas_fallback'
          }
        });

        balance = fallbackBalance;
        awardWarning = `Fallback local aplicado: ${awardError instanceof Error ? awardError.message : 'service role indisponível'}`;
      } catch (fallbackError) {
        awardWarning = fallbackError instanceof Error ? fallbackError.message : 'Falha ao conceder coins';
        coinsAwarded = {
          amount: 0,
          descricao: 'Gratidão registrada. Coins não creditados agora.'
        };
      }
    }

    return NextResponse.json(
      {
        entry,
        stats: { streak },
        coins_awarded: coinsAwarded,
        balance,
        award_warning: awardWarning
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Erro interno ao registrar gratidão' }, { status: 500 });
  }
}
