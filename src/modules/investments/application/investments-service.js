import { getServiceSupabase } from '@/src/lib/supabase/service';
import { DEFAULT_POLICY_RULES } from '../domain/investments.constants';
import { checkNewPosition } from '../domain/investments.policy';
import { coinClaimsForContribution, coinClaimsForReserve } from '../domain/investments.coins';
import { reserveStatus } from '../domain/investments.goals';
import { deriveQuantity } from '../domain/investments.valuation';
import { pricingMethodFor } from '../domain/investments.validation';
import { awardInvestmentClaims } from './investments-coins';
import { getCurrentPolicy } from './investments-policy-service';
import { revalueUser } from './investments-valuation-service';

const fail = (error, fallback, status) => { if (error) { const next = new Error(error.message || fallback); if (status) next.status = status; throw next; } };

export async function ensureDefaults({ supabase, userId, service = getServiceSupabase() }) {
  const goals = await supabase.from('investment_goals').select('id,kind').eq('user_id', userId).is('archived_at', null); fail(goals.error, 'goals_load_failed');
  for (const item of [{ kind: 'reserva_liquidez', name: 'Reserva de Liquidez', sort_order: 0 }, { kind: 'independencia', name: 'Independência financeira', sort_order: 99 }]) {
    if (!(goals.data || []).some((goal) => goal.kind === item.kind)) { const inserted = await supabase.from('investment_goals').insert({ ...item, user_id: userId }); if (inserted.error && inserted.error.code !== '23505') fail(inserted.error, 'goal_default_failed'); }
  }
  const current = await service.from('investment_policies').select('id').eq('user_id', userId).limit(1).maybeSingle(); fail(current.error, 'policy_default_load_failed');
  if (!current.data) {
    const settings = await service.from('patrimony_settings').select('reserve_target_months').eq('user_id', userId).maybeSingle();
    fail(settings.error, 'settings_load_failed');
    const months = Number(settings.data?.reserve_target_months || 6); const rules = DEFAULT_POLICY_RULES.map((rule) => rule.type === 'reserve_months_target' ? { ...rule, params: { months } } : rule);
    const inserted = await service.from('investment_policies').insert({ user_id: userId, version: 1, rules, created_by_role: 'sistema' }); if (inserted.error && inserted.error.code !== '23505') fail(inserted.error, 'policy_default_failed');
  }
}

export async function listGoals({ supabase, userId }) { const { data, error } = await supabase.from('investment_goals').select('*').eq('user_id', userId).is('archived_at', null).order('sort_order'); fail(error, 'goals_load_failed'); return data || []; }
export async function createGoal({ supabase, userId, input }) { const { data, error } = await supabase.from('investment_goals').insert({ ...input, user_id: userId }).select('*').single(); fail(error, 'goal_create_failed'); return data; }
export async function updateGoal({ supabase, userId, id, input }) { const { data, error } = await supabase.from('investment_goals').update(input).eq('id', id).eq('user_id', userId).select('*').maybeSingle(); fail(error, 'goal_update_failed'); if (!data) fail(new Error('not_found'), null, 404); return data; }
export async function archiveGoal({ supabase, userId, id }) { const goal = await supabase.from('investment_goals').select('id,kind').eq('id', id).eq('user_id', userId).maybeSingle(); fail(goal.error); if (!goal.data) fail(new Error('not_found'), null, 404); if (goal.data.kind !== 'objetivo_prazo') fail(new Error('goal_required'), null, 409); const positions = await supabase.from('investment_positions').select('id', { count: 'exact', head: true }).eq('goal_id', id).eq('status', 'ativa').is('archived_at', null); fail(positions.error); if (positions.count) fail(new Error('goal_has_positions'), null, 409); const saved = await supabase.from('investment_goals').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId); fail(saved.error); }

export async function listPositions({ supabase, userId }) { const { data, error } = await supabase.from('investment_positions').select('*').eq('user_id', userId).is('archived_at', null).order('created_at'); fail(error, 'positions_load_failed'); return data || []; }
export async function getPosition({ supabase, userId, id }) { const position = await supabase.from('investment_positions').select('*').eq('id', id).eq('user_id', userId).is('archived_at', null).maybeSingle(); fail(position.error); if (!position.data) fail(new Error('not_found'), null, 404); const movements = await supabase.from('investment_movements').select('*').eq('position_id', id).eq('user_id', userId).order('occurred_on', { ascending: false }); fail(movements.error); return { ...position.data, movements: movements.data || [] }; }

async function policyWarnings({ supabase, userId, draft }) { const [goals, positions, policy, settings] = await Promise.all([listGoals({ supabase, userId }), listPositions({ supabase, userId }), getCurrentPolicy({ supabase, userId }), supabase.from('patrimony_settings').select('monthly_cost_of_living').eq('user_id', userId).maybeSingle()]); fail(settings.error, 'settings_load_failed'); return checkNewPosition({ draft, rules: policy?.rules || [], positions, goals, costOfLiving: settings.data?.monthly_cost_of_living }); }

async function latestUnitPrice(position, service = getServiceSupabase()) {
  const source = ({ b3_quote: 'brapi', tesouro_price: 'tesouro', cvm_quota: 'cvm' })[position.pricing_method];
  const symbol = position.pricing_method === 'b3_quote' ? position.ticker : position.pricing_method === 'tesouro_price' ? position.tesouro_code : position.cnpj;
  if (source && symbol) {
    const normalizedSymbol = position.pricing_method === 'cvm_quota' ? String(symbol).replace(/\D/g, '') : String(symbol);
    const quote = await service.from('market_quotes').select('price').eq('source', source).eq('symbol', normalizedSymbol).order('quote_date', { ascending: false }).limit(1).maybeSingle();
    fail(quote.error, 'quote_load_failed');
    return Number(quote.data?.price) || null;
  }
  if (position.pricing_method === 'fx_ptax') {
    const quote = await service.from('market_index_series').select('value').eq('series', 'ptax_usd').order('ref_date', { ascending: false }).limit(1).maybeSingle();
    fail(quote.error, 'quote_load_failed');
    return Number(quote.data?.value) || null;
  }
  return null;
}

async function reserveClaims({ supabase, userId }) {
  const [goals, positions, settings] = await Promise.all([
    listGoals({ supabase, userId }), listPositions({ supabase, userId }),
    supabase.from('patrimony_settings').select('monthly_cost_of_living,reserve_target_months').eq('user_id', userId).maybeSingle()
  ]);
  fail(settings.error, 'settings_load_failed');
  const reserve = goals.find((item) => item.kind === 'reserva_liquidez');
  const total = positions.filter((item) => item.goal_id === reserve?.id).reduce((sum, item) => sum + Number(item.current_value || 0), 0);
  const targetMonths = settings.data?.reserve_target_months || 6;
  const status = reserveStatus({ reserveTotal: total, costOfLiving: settings.data?.monthly_cost_of_living, targetMonths });
  return coinClaimsForReserve({ months: status.months, targetMonths });
}

async function syncPositionQuantity({ supabase, userId, positionId }) {
  const listed = await supabase.from('investment_movements').select('kind,quantity').eq('position_id', positionId).eq('user_id', userId).not('quantity', 'is', null);
  fail(listed.error, 'movements_load_failed');
  if (!listed.data?.length) return;
  const quantity = listed.data.reduce((total, item) => total + (['resgate', 'vencimento'].includes(item.kind) ? -1 : 1) * Number(item.quantity || 0), 0);
  const saved = await supabase.from('investment_positions').update({ quantity: Math.max(0, Math.round(quantity * 1e8) / 1e8) }).eq('id', positionId).eq('user_id', userId);
  fail(saved.error, 'position_quantity_failed');
}

export async function createPosition({ supabase, userId, input }) {
  const { first_contribution: first, current_balance, form_type, ...values } = input; const before = await supabase.from('investment_movements').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'aporte'); fail(before.error);
  const warnings = await policyWarnings({ supabase, userId, draft: { ...values, current_value: first.amount } });
  const price = values.quantity == null && current_balance != null ? await latestUnitPrice(values) : null;
  const quantity = values.quantity ?? (price ? deriveQuantity({ balance: current_balance, price }) : null);
  const initial = values.pricing_method === 'manual' ? (values.manual_value ?? current_balance ?? first.amount) : first.amount;
  const created = await supabase.from('investment_positions').insert({ ...values, quantity, user_id: userId, manual_value: values.pricing_method === 'manual' ? initial : values.manual_value, current_value: initial, invested_amount: first.amount }).select('*').single(); fail(created.error, 'position_create_failed');
  const movement = await supabase.from('investment_movements').insert({ ...first, quantity, kind: 'aporte', user_id: userId, position_id: created.data.id }).select('*').single(); fail(movement.error, 'movement_create_failed');
  await revalueUser(userId); const position = await getPosition({ supabase, userId, id: created.data.id });
  const claims = [...coinClaimsForContribution({ movement: movement.data, isFirstEverContribution: (before.count || 0) === 0 }), ...await reserveClaims({ supabase, userId })]; const coins = await awardInvestmentClaims({ userId, claims });
  return { position, coins, policyWarnings: warnings };
}
export async function updatePosition({ supabase, userId, id, input }) { const { first_contribution, current_balance, form_type, ...values } = input; const current = await supabase.from('investment_positions').select('*').eq('id', id).eq('user_id', userId).maybeSingle(); fail(current.error); if (!current.data) fail(new Error('not_found'), null, 404); const merged = { ...current.data, ...values }; if (values.asset_class !== undefined || values.indexer !== undefined || values.cnpj !== undefined) values.pricing_method = pricingMethodFor(merged); if (current_balance != null && values.quantity == null) { const price = await latestUnitPrice({ ...merged, ...values }); if (price) values.quantity = deriveQuantity({ balance: current_balance, price }); else if ((values.pricing_method || merged.pricing_method) === 'manual') values.manual_value = current_balance; } const saved = await supabase.from('investment_positions').update(values).eq('id', id).eq('user_id', userId).select('*').maybeSingle(); fail(saved.error); await revalueUser(userId); return getPosition({ supabase, userId, id }); }
export async function archivePosition({ supabase, userId, id }) { const saved = await supabase.from('investment_positions').update({ archived_at: new Date().toISOString(), status: 'encerrada' }).eq('id', id).eq('user_id', userId).select('id').maybeSingle(); fail(saved.error); if (!saved.data) fail(new Error('not_found'), null, 404); }

export async function addMovement({ supabase, userId, positionId, input }) {
  const before = input.kind === 'aporte' ? await supabase.from('investment_movements').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'aporte') : { count: 0 };
  const inserted = await supabase.from('investment_movements').insert({ ...input, user_id: userId, position_id: positionId }).select('*').single(); fail(inserted.error, 'movement_create_failed'); await syncPositionQuantity({ supabase, userId, positionId }); await revalueUser(userId);
  const position = await getPosition({ supabase, userId, id: positionId }); let claims = coinClaimsForContribution({ movement: inserted.data, isFirstEverContribution: (before.count || 0) === 0 });
  if (input.kind === 'aporte') claims = [...claims, ...await reserveClaims({ supabase, userId })];
  return { movement: inserted.data, position, coins: await awardInvestmentClaims({ userId, claims }) };
}
export async function updateMovement({ supabase, userId, id, input }) { const found = await supabase.from('investment_movements').update(input).eq('id', id).eq('user_id', userId).select('*').maybeSingle(); fail(found.error); if (!found.data) fail(new Error('not_found'), null, 404); await syncPositionQuantity({ supabase, userId, positionId: found.data.position_id }); await revalueUser(userId); return found.data; }
export async function deleteMovement({ supabase, userId, id }) { const found = await supabase.from('investment_movements').select('position_id').eq('id', id).eq('user_id', userId).maybeSingle(); fail(found.error); if (!found.data) fail(new Error('not_found'), null, 404); const deleted = await supabase.from('investment_movements').delete().eq('id', id).eq('user_id', userId); fail(deleted.error); await syncPositionQuantity({ supabase, userId, positionId: found.data.position_id }); await revalueUser(userId); return found.data.position_id; }
export { policyWarnings as checkPositionPolicy };
