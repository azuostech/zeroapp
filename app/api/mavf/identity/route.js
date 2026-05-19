import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { awardMavfCoinsWithSession } from '@/src/modules/mavf/application/mavf-coins-award';

function normalizeText(value) {
  return String(value || '').trim();
}

function resolveDbErrorMessage(error, fallbackMessage) {
  const code = String(error?.code || '').trim();

  if (code === '42P01') {
    return 'Tabela public.identity_declarations não encontrada. Execute scripts/migrate-etapa3-mavf-praticas.sql no SQL Editor do Supabase.';
  }

  if (code === '42501') {
    return 'Sem permissão para acessar identidade. Verifique autenticação e políticas RLS.';
  }

  return error?.message || fallbackMessage;
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

  const { data, error } = await supabase
    .from('identity_declarations')
    .select('*')
    .eq('user_id', context.targetUserId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: resolveDbErrorMessage(error, 'Erro ao carregar identidade') }, { status: 500 });
  }

  const declarations = data || [];

  return NextResponse.json({
    declarations,
    total: declarations.length,
    ultima: declarations.length > 0 ? declarations[declarations.length - 1] : null
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

    const declaracao = normalizeText(body?.declaracao);
    const contexto = normalizeText(body?.contexto);
    const encontroRef = normalizeText(body?.encontro_ref);

    if (!declaracao) {
      return NextResponse.json({ error: 'Declaração é obrigatória' }, { status: 422 });
    }

    if (declaracao.length > 280) {
      return NextResponse.json({ error: 'Declaração muito longa (máx 280 caracteres)' }, { status: 422 });
    }

    const { data: declaration, error } = await supabase
      .from('identity_declarations')
      .insert({
        user_id: context.targetUserId,
        declaracao,
        contexto: contexto || null,
        encontro_ref: encontroRef || null
      })
      .select('*')
      .single();

    if (error || !declaration) {
      return NextResponse.json({ error: resolveDbErrorMessage(error, 'Erro ao registrar identidade') }, { status: 500 });
    }

    let awardWarning = null;
    let coinsAwarded = {
      amount: 30,
      descricao: '+30 🪙 Nova identidade registrada 💎'
    };
    let balance = null;

    try {
      const serviceSupabase = getServiceSupabase();
      const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('award_coins', {
        p_user_id: context.targetUserId,
        p_amount: 30,
        p_action_type: 'identity_registered',
        p_description: 'Nova declaração de identidade',
        p_metadata: {
          declaration_id: declaration.id,
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
          amount: 30,
          actionType: 'identity_registered',
          description: 'Nova declaração de identidade',
          metadata: {
            declaration_id: declaration.id,
            source: 'mavf_praticas_fallback'
          }
        });

        balance = fallbackBalance;
        awardWarning = `Fallback local aplicado: ${awardError instanceof Error ? awardError.message : 'service role indisponível'}`;
      } catch (fallbackError) {
        awardWarning = fallbackError instanceof Error ? fallbackError.message : 'Falha ao conceder coins';
        coinsAwarded = {
          amount: 0,
          descricao: 'Identidade registrada. Coins não creditados agora.'
        };
      }
    }

    return NextResponse.json(
      {
        declaration,
        coins_awarded: coinsAwarded,
        balance,
        award_warning: awardWarning
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Erro interno ao registrar identidade' }, { status: 500 });
  }
}
