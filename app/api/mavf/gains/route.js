import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { parsePositiveLimit } from '@/src/modules/mavf/application/practices-utils';
import { awardMavfCoinsWithSession } from '@/src/modules/mavf/application/mavf-coins-award';
import { publishFeedEvent } from '@/src/modules/community/application/feed-publisher';

const VALID_SIZES = ['pequeno', 'medio', 'grande'];

function resolveDbErrorMessage(error, fallbackMessage) {
  const code = String(error?.code || '').trim();

  if (code === '42P01') {
    return 'Tabela public.gains não encontrada. Execute scripts/migrate-etapa3-mavf-praticas.sql no SQL Editor do Supabase.';
  }

  if (code === '42501') {
    return 'Sem permissão para acessar ganhos. Verifique autenticação e políticas RLS.';
  }

  return error?.message || fallbackMessage;
}

function normalizeDescription(value) {
  return String(value || '').trim();
}

function normalizeSize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolveCoinsAward(size) {
  const isLarge = size === 'grande';
  const amount = isLarge ? 20 : 10;
  return {
    amount,
    description: isLarge ? `+${amount} 🪙 (bônus por ganho grande!)` : `+${amount} 🪙`
  };
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const limit = parsePositiveLimit(searchParams.get('limit'), 50, 200);
  const requestedUserId = searchParams.get('user_id');

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { data, count, error } = await supabase
    .from('gains')
    .select('*', { count: 'exact' })
    .eq('user_id', context.targetUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: resolveDbErrorMessage(error, 'Erro ao carregar ganhos') }, { status: 500 });
  }

  const gains = data || [];
  const weekThreshold = new Date();
  weekThreshold.setDate(weekThreshold.getDate() - 7);
  const { count: weekCount, error: weekError } = await supabase
    .from('gains')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', context.targetUserId)
    .gte('created_at', weekThreshold.toISOString());

  if (weekError) {
    return NextResponse.json({ error: resolveDbErrorMessage(weekError, 'Erro ao calcular ganhos da semana') }, { status: 500 });
  }

  return NextResponse.json({
    gains,
    stats: {
      total: Number(count || 0),
      semana: Number(weekCount || 0)
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

    const descricao = normalizeDescription(body?.descricao);
    const tamanho = normalizeSize(body?.tamanho);

    if (!descricao) {
      return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 422 });
    }

    if (!VALID_SIZES.includes(tamanho)) {
      return NextResponse.json({ error: 'Tamanho inválido' }, { status: 422 });
    }

    const { data: gain, error } = await supabase
      .from('gains')
      .insert({
        user_id: context.targetUserId,
        descricao,
        tamanho
      })
      .select('*')
      .single();

    if (error || !gain) {
      return NextResponse.json({ error: resolveDbErrorMessage(error, 'Erro ao registrar ganho') }, { status: 500 });
    }

    if (tamanho === 'grande') {
      await publishFeedEvent(supabase, {
        userId: context.targetUserId,
        eventType: 'gain_grande',
        title: 'Registrou um grande ganho! ⚡',
        body: gain.descricao,
        metadata: { gain_id: gain.id }
      });
    }

    const { amount, description } = resolveCoinsAward(tamanho);
    let awardWarning = null;
    let coinsAwarded = {
      amount,
      action_type: 'gain_registered',
      descricao: description
    };
    let balance = null;

    try {
      const serviceSupabase = getServiceSupabase();
      const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('award_coins', {
        p_user_id: context.targetUserId,
        p_amount: amount,
        p_action_type: 'gain_registered',
        p_description: `Ganho registrado: ${tamanho}`,
        p_metadata: {
          gain_id: gain.id,
          tamanho,
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
          amount,
          actionType: 'gain_registered',
          description: `Ganho registrado: ${tamanho}`,
          metadata: {
            gain_id: gain.id,
            tamanho,
            source: 'mavf_praticas_fallback'
          }
        });

        balance = fallbackBalance;
        awardWarning = `Fallback local aplicado: ${awardError instanceof Error ? awardError.message : 'service role indisponível'}`;
      } catch (fallbackError) {
        awardWarning = fallbackError instanceof Error ? fallbackError.message : 'Falha ao conceder coins';
        coinsAwarded = {
          amount: 0,
          action_type: 'gain_registered',
          descricao: 'Ganho registrado. Coins não creditados agora.'
        };
      }
    }

    return NextResponse.json(
      {
        gain,
        coins_awarded: coinsAwarded,
        balance,
        award_warning: awardWarning
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Erro interno ao registrar ganho' }, { status: 500 });
  }
}
