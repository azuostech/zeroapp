import { sendPushToUser } from '@/src/lib/push/push-service';

const EVENT_AMOUNTS = {
  item_realized: 5,
  first_launch_month: 10,
  goal_reached: 150,
  month_complete: 100
};

async function notifyCoinsMilestone(userId, actionType) {
  try {
    if (actionType === 'month_complete') {
      await sendPushToUser(userId, {
        title: 'Mês completo! 🎉',
        body: 'Todos os blocos realizados. +100 ZeroCoins!',
        url: '/jornada'
      });
      return;
    }

    if (actionType === 'goal_reached') {
      await sendPushToUser(userId, {
        title: 'Meta de reserva atingida! 🏦',
        body: '+150 ZeroCoins pela consistência.',
        url: '/jornada'
      });
    }
  } catch (error) {
    console.error('[coins-evaluator] push notificação falhou:', {
      userId,
      actionType,
      reason: error?.message || 'unknown_error'
    });
  }
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toPeriod(month, year) {
  return {
    month: pad2(month),
    year: String(year)
  };
}

function getMonthWindow(month, year) {
  const monthNum = Number(month);
  const yearNum = Number(year);
  const start = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function checkMonthComplete(data) {
  const simpleBlocks = ['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute'];
  const simpleComplete = simpleBlocks.every((block) => {
    const items = Array.isArray(data?.[block]) ? data[block] : [];
    return items.every((item) => Boolean(item?.realized));
  });

  const contasComplete = (Array.isArray(data?.contas) ? data.contas : []).every((group) => {
    const subcats = Array.isArray(group?.subcats) ? group.subcats : [];
    return subcats.every((subcat) => Boolean(subcat?.realized));
  });

  return simpleComplete && contasComplete;
}

function checkGoalReached(data) {
  const items = Array.isArray(data?.['pagar-primeiro']) ? data['pagar-primeiro'] : [];
  return items.length > 0 && items.every((item) => Boolean(item?.realized));
}

function buildItemKey(toggleContext) {
  if (toggleContext?.bloco === 'contas') {
    return `contas:${toggleContext.grupoIndex}:${toggleContext.subcatIndex}`;
  }
  return `${toggleContext?.bloco || 'unknown'}:${toggleContext?.itemIndex ?? -1}`;
}

async function hasActionThisMonth({ supabase, userId, actionType, month, year }) {
  const { startIso, endIso } = getMonthWindow(month, year);

  const { data, error } = await supabase
    .from('coins_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || `coins_action_check_failed:${actionType}`);
  return Boolean(data);
}

async function hasItemRealizedAward({ supabase, userId, month, year, itemKey }) {
  const period = toPeriod(month, year);

  const { data, error } = await supabase
    .from('coins_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('action_type', 'item_realized')
    .contains('metadata', {
      month: period.month,
      year: period.year,
      item_key: itemKey
    })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'coins_item_check_failed');
  return Boolean(data);
}

async function awardWithRpc({ supabase, userId, amount, actionType, description, metadata }) {
  const { data, error } = await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_action_type: actionType,
    p_description: description,
    p_metadata: metadata || {}
  });

  if (error) {
    throw new Error(error.message || `award_coins_failed:${actionType}`);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    action_type: actionType,
    amount,
    description,
    metadata: metadata || {},
    balance: {
      coins: Number(row?.new_coins || 0),
      coins_total: Number(row?.new_total || 0),
      phase: String(row?.new_phase || 'BOMBEIRO')
    }
  };
}

async function maybeAwardMonthlyAction({
  supabase,
  userId,
  month,
  year,
  actionType,
  amount,
  description,
  metadata
}) {
  const alreadyAwarded = await hasActionThisMonth({
    supabase,
    userId,
    actionType,
    month,
    year
  });

  if (alreadyAwarded) return null;

  return awardWithRpc({
    supabase,
    userId,
    amount,
    actionType,
    description,
    metadata
  });
}

export async function evaluateCoinsAfterToggle({
  supabase,
  userId,
  month,
  year,
  data,
  toggleContext,
  wasRealized,
  isNowRealized
}) {
  const awards = [];
  let balance = null;

  if (wasRealized || !isNowRealized) {
    return { awards, balance };
  }

  const period = toPeriod(month, year);
  const baseMetadata = {
    month: period.month,
    year: period.year,
    source: 'toggle_realized'
  };

  const itemKey = buildItemKey(toggleContext);
  const itemAlreadyAwarded = await hasItemRealizedAward({
    supabase,
    userId,
    month: period.month,
    year: period.year,
    itemKey
  });

  if (!itemAlreadyAwarded) {
    const itemAward = await awardWithRpc({
      supabase,
      userId,
      amount: EVENT_AMOUNTS.item_realized,
      actionType: 'item_realized',
      description: 'Item realizado',
      metadata: {
        ...baseMetadata,
        item_key: itemKey,
        bloco: toggleContext?.bloco || null,
        item_index: toggleContext?.itemIndex ?? null,
        grupo_index: toggleContext?.grupoIndex ?? null,
        subcat_index: toggleContext?.subcatIndex ?? null
      }
    });
    awards.push(itemAward);
    balance = itemAward.balance;
  }

  const firstLaunchAward = await maybeAwardMonthlyAction({
    supabase,
    userId,
    month: period.month,
    year: period.year,
    actionType: 'first_launch_month',
    amount: EVENT_AMOUNTS.first_launch_month,
    description: 'Primeiro lançamento realizado do mês',
    metadata: baseMetadata
  });

  if (firstLaunchAward) {
    awards.push(firstLaunchAward);
    balance = firstLaunchAward.balance;
  }

  if (checkGoalReached(data)) {
    const goalAward = await maybeAwardMonthlyAction({
      supabase,
      userId,
      month: period.month,
      year: period.year,
      actionType: 'goal_reached',
      amount: EVENT_AMOUNTS.goal_reached,
      description: 'Meta de reserva atingida!',
      metadata: baseMetadata
    });

    if (goalAward) {
      awards.push(goalAward);
      balance = goalAward.balance;
      await notifyCoinsMilestone(userId, 'goal_reached');
    }
  }

  if (checkMonthComplete(data)) {
    const monthAward = await maybeAwardMonthlyAction({
      supabase,
      userId,
      month: period.month,
      year: period.year,
      actionType: 'month_complete',
      amount: EVENT_AMOUNTS.month_complete,
      description: `Mês ${period.month}/${period.year} completo!`,
      metadata: baseMetadata
    });

    if (monthAward) {
      awards.push(monthAward);
      balance = monthAward.balance;
      await notifyCoinsMilestone(userId, 'month_complete');
    }
  }

  return { awards, balance };
}
