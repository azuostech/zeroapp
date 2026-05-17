import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import {
  awardCoins,
  calculatePhase,
  DEFAULT_COINS_ACTION_AMOUNTS,
  getCoinsBalance,
  getDefaultCoinsDescription,
  hasReceivedCoinsThisMonth,
  isValidCoinsAction,
  validateCoinsAward
} from '@/src/modules/coins/application/coins-service';
import { checkMonthCompletionData } from '@/lib/utils/checkMonthCompletion';

const MAX_AWARD_AMOUNT = 1000000;

function parsePositiveAmount(value) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || Number.isNaN(parsed) || !Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed <= 0 || parsed > MAX_AWARD_AMOUNT) return null;
  return parsed;
}

function parseMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function resolvePeriodFromMetadata(metadata) {
  const now = new Date();
  const fallback = { month: now.getMonth() + 1, year: now.getFullYear() };

  const rawMonth = Number(metadata?.month);
  const rawYear = Number(metadata?.year);
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : fallback.month;
  const year = Number.isInteger(rawYear) && rawYear >= 1970 ? rawYear : fallback.year;

  return { month, year };
}

function shouldCheckMonthlyIdempotency(actionType) {
  return actionType === 'first_launch_month' || actionType === 'month_complete';
}

async function loadCurrentBalanceAndPhase(serviceSupabase, userId) {
  const currentBalance = await getCoinsBalance({
    supabase: serviceSupabase,
    userId
  });

  return {
    coins: Number(currentBalance.coins || 0),
    coins_total: Number(currentBalance.coins_total || 0),
    phase: calculatePhase(currentBalance.coins_total).phase
  };
}

async function isFinancialMonthComplete(serviceSupabase, userId, period) {
  const month = String(period.month).padStart(2, '0');
  const year = String(period.year);

  const { data, error } = await serviceSupabase
    .from('financial_data')
    .select('data')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'financial_data_lookup_failed');
  }

  if (!data?.data) return false;
  return checkMonthCompletionData(data.data);
}

function resolveAwardAmount({ actionType, body, isAdmin }) {
  const hasCustomAmount = typeof body?.custom_amount !== 'undefined' || typeof body?.amount !== 'undefined';
  const customAmountRaw = typeof body?.custom_amount !== 'undefined' ? body.custom_amount : body?.amount;
  const defaultAmount = DEFAULT_COINS_ACTION_AMOUNTS[actionType];

  if (!hasCustomAmount) {
    if (typeof defaultAmount !== 'number') {
      return { amount: null, error: 'missing_amount_for_action' };
    }
    return { amount: defaultAmount, error: null };
  }

  const parsedCustomAmount = parsePositiveAmount(customAmountRaw);
  if (parsedCustomAmount === null) {
    return { amount: null, error: 'invalid_amount' };
  }

  if (!isAdmin) {
    if (typeof defaultAmount !== 'number') {
      return { amount: null, error: 'forbidden_custom_amount' };
    }

    if (parsedCustomAmount !== defaultAmount) {
      return { amount: null, error: 'forbidden_custom_amount' };
    }
  }

  return { amount: parsedCustomAmount, error: null };
}

function resolveDescription({ actionType, body }) {
  const customDescription = typeof body?.custom_description === 'string' ? body.custom_description.trim() : '';
  const legacyDescription = typeof body?.description === 'string' ? body.description.trim() : '';
  return customDescription || legacyDescription || getDefaultCoinsDescription(actionType);
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json(
      {
        error: 'invalid_json',
        details: 'body deve ser um JSON válido'
      },
      { status: 400 }
    );
  }

  const action_type = String(body?.action_type || '').trim();
  if (!action_type || !isValidCoinsAction(action_type)) {
    return NextResponse.json(
      {
        error: 'invalid_coins_award',
        details: 'action_type deve ser válido'
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

  const isAdmin = Boolean(profile?.is_admin || profile?.role === 'admin');
  if (!isAdmin && action_type === 'admin_adjustment') {
    return NextResponse.json(
      {
        error: 'forbidden_action',
        details: 'ação permitida apenas para admin'
      },
      { status: 403 }
    );
  }

  const amountResolution = resolveAwardAmount({ actionType: action_type, body, isAdmin });
  if (amountResolution.error === 'missing_amount_for_action') {
    return NextResponse.json(
      {
        error: 'invalid_coins_award',
        details: 'amount obrigatório para esta ação'
      },
      { status: 400 }
    );
  }

  if (amountResolution.error === 'invalid_amount') {
    return NextResponse.json(
      {
        error: 'invalid_coins_award',
        details: 'amount deve ser inteiro positivo'
      },
      { status: 400 }
    );
  }

  if (amountResolution.error === 'forbidden_custom_amount') {
    return NextResponse.json(
      {
        error: 'forbidden_custom_amount',
        details: 'usuário não pode definir amount customizado para esta ação'
      },
      { status: 403 }
    );
  }

  const amount = amountResolution.amount;
  if (!validateCoinsAward(amount, action_type)) {
    return NextResponse.json(
      {
        error: 'invalid_coins_award',
        details: 'amount deve ser número != 0 e action_type deve ser válido'
      },
      { status: 400 }
    );
  }

  const description = resolveDescription({ actionType: action_type, body });
  const metadata = parseMetadata(body?.metadata);
  const period = resolvePeriodFromMetadata(metadata);

  try {
    const serviceSupabase = getServiceSupabase();

    if (action_type === 'month_complete') {
      const isComplete = await isFinancialMonthComplete(serviceSupabase, user.id, period);
      if (!isComplete) {
        const current = await loadCurrentBalanceAndPhase(serviceSupabase, user.id);
        return NextResponse.json({
          success: true,
          awarded: false,
          reason: 'month_incomplete',
          new_coins: current.coins,
          new_total: current.coins_total,
          new_phase: current.phase,
          amount_awarded: 0,
          description: 'Mes ainda incompleto para recompensa',
          data: {
            coins: current.coins,
            coins_total: current.coins_total,
            amount: 0,
            phase: current.phase
          },
          message: 'Mes ainda nao esta completo'
        });
      }
    }

    if (shouldCheckMonthlyIdempotency(action_type)) {
      const alreadyAwarded = await hasReceivedCoinsThisMonth({
        supabase: serviceSupabase,
        userId: user.id,
        action_type,
        month: period.month,
        year: period.year
      });

      if (alreadyAwarded) {
        const current = await loadCurrentBalanceAndPhase(serviceSupabase, user.id);

        return NextResponse.json({
          success: true,
          awarded: false,
          reason: 'already_awarded_this_month',
          new_coins: current.coins,
          new_total: current.coins_total,
          new_phase: current.phase,
          amount_awarded: 0,
          description:
            action_type === 'month_complete'
              ? 'Recompensa de mes completo ja registrada neste mes'
              : 'Primeiro acesso do mes ja recompensado',
          data: {
            coins: current.coins,
            coins_total: current.coins_total,
            amount: 0,
            phase: current.phase
          },
          message:
            action_type === 'month_complete'
              ? 'Mes completo ja premiado neste periodo'
              : 'Primeiro acesso ja registrado neste mes'
        });
      }
    }

    let nextCoins = 0;
    let nextTotal = 0;
    let nextPhase = 'BOMBEIRO';

    const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('award_coins', {
      p_user_id: user.id,
      p_amount: amount,
      p_action_type: action_type,
      p_description: description,
      p_metadata: metadata
    });

    const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    if (!rpcError && rpcRow) {
      nextCoins = Number(rpcRow.new_coins || 0);
      nextTotal = Number(rpcRow.new_total || 0);
      nextPhase = String(rpcRow.new_phase || 'BOMBEIRO');
    } else {
      const fallbackResult = await awardCoins({
        supabase: serviceSupabase,
        userId: user.id,
        amount,
        action_type,
        description
      });

      nextCoins = Number(fallbackResult.coins || 0);
      nextTotal = Number(fallbackResult.coins_total || 0);
      nextPhase = calculatePhase(nextTotal).phase;
    }

    return NextResponse.json({
      success: true,
      new_coins: nextCoins,
      new_total: nextTotal,
      new_phase: nextPhase,
      amount_awarded: amount,
      description,
      data: {
        coins: nextCoins,
        coins_total: nextTotal,
        amount,
        phase: nextPhase
      },
      message: `${amount > 0 ? '+' : ''}${amount} ZeroCoins`
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
