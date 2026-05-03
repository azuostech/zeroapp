const VALID_COINS_ACTIONS = [
  'signup',
  'first_launch_month',
  'month_complete',
  'goal_reached',
  'debt_cleared',
  'referral',
  'workshop_code',
  'tier_upgrade_aceleracao',
  'tier_upgrade_autogoverno',
  'admin_adjustment'
];

const DEFAULT_DESCRIPTIONS = {
  signup: 'Boas-vindas ao ZERO App',
  first_launch_month: 'Primeiro lançamento do mês',
  month_complete: 'Mês completo - todos os 6 blocos',
  goal_reached: 'Meta de reserva atingida',
  debt_cleared: 'Dívida quitada',
  referral: 'Indicação de amigo',
  workshop_code: 'Código do Workshop resgatado',
  tier_upgrade_aceleracao: 'Bônus mensal tier Aceleração',
  tier_upgrade_autogoverno: 'Bônus mensal tier Autogoverno',
  admin_adjustment: 'Ajuste administrativo'
};

/**
 * Busca saldo atual de ZeroCoins do usuário.
 */
export async function getCoinsBalance({ supabase, userId }) {
  const { data, error } = await supabase
    .from('coins_balance')
    .select('coins, coins_total')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erro ao carregar saldo de ZeroCoins');
  return data || { coins: 0, coins_total: 0 };
}

/**
 * Adiciona ZeroCoins ao saldo do usuário.
 */
export async function awardCoins({ supabase, userId, amount, action_type, description }) {
  if (!validateCoinsAward(amount, action_type)) {
    throw new Error('invalid_coins_award');
  }

  const { data: currentBalance, error: balanceError } = await supabase
    .from('coins_balance')
    .select('coins, coins_total')
    .eq('user_id', userId)
    .maybeSingle();

  if (balanceError) throw new Error(balanceError.message || 'Erro ao buscar saldo de ZeroCoins');

  const currentCoins = currentBalance?.coins || 0;
  const currentCoinsTotal = currentBalance?.coins_total || 0;
  const coins = currentCoins + amount;
  const coins_total = currentCoinsTotal + (amount > 0 ? amount : 0);

  const { error: upsertError } = await supabase.from('coins_balance').upsert(
    {
      user_id: userId,
      coins,
      coins_total,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
  if (upsertError) throw new Error(upsertError.message || 'Erro ao atualizar saldo de ZeroCoins');

  const { error: transactionError } = await supabase.from('coins_transactions').insert({
    user_id: userId,
    amount,
    action_type,
    description: description || getDefaultDescription(action_type),
    created_at: new Date().toISOString()
  });
  if (transactionError) throw new Error(transactionError.message || 'Erro ao registrar transação de ZeroCoins');

  return { coins, coins_total, amount };
}

/**
 * Busca histórico de transações do usuário.
 */
export async function getCoinsHistory({ supabase, userId, limit = 20 }) {
  const { data, error } = await supabase
    .from('coins_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message || 'Erro ao carregar histórico de ZeroCoins');
  return data || [];
}

/**
 * Calcula fase de gamificação baseado em coins_total.
 */
export function calculatePhase(coins_total) {
  if (coins_total <= 200) return { phase: 'BOMBEIRO', emoji: '🔥', min: 0, max: 200 };
  if (coins_total <= 800) return { phase: 'SOBREVIVENTE', emoji: '🌱', min: 201, max: 800 };
  if (coins_total <= 2000) return { phase: 'CONSTRUTOR', emoji: '🏗️', min: 801, max: 2000 };
  return { phase: 'MULTIPLICADOR', emoji: '💎', min: 2001, max: Infinity };
}

/**
 * Validação de award de coins.
 */
export function validateCoinsAward(amount, action_type) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount === 0) return false;
  if (typeof action_type !== 'string' || action_type.length === 0) return false;
  return VALID_COINS_ACTIONS.includes(action_type);
}

/**
 * Valida se usuário já recebeu coins por uma ação neste mês.
 */
export async function hasReceivedCoinsThisMonth({ supabase, userId, action_type, month, year }) {
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error('invalid_month');
  }

  if (!Number.isInteger(yearNum) || yearNum < 1970) {
    throw new Error('invalid_year');
  }

  const startOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0)).toISOString();
  const endOfMonth = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59)).toISOString();

  const { data, error } = await supabase
    .from('coins_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('action_type', action_type)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)
    .limit(1);

  if (error) throw new Error(error.message || 'Erro ao verificar histórico de ZeroCoins');
  return Array.isArray(data) && data.length > 0;
}

function getDefaultDescription(action_type) {
  return DEFAULT_DESCRIPTIONS[action_type] || 'ZeroCoins';
}
