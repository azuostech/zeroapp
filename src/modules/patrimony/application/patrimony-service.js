import { totalPrevisto, totalPrevistoContas } from '@/src/modules/finance/domain/finance.calculations';

const fail = (error, fallback) => { if (error) throw new Error(error.message || fallback); };
const differences = (before = {}, after = {}) => Object.fromEntries(Object.keys(after).filter((key) => !['user_id', 'id'].includes(key) && JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)).map((key) => [key, { from: before[key] ?? null, to: after[key] ?? null }]));

export async function listAssets({ supabase, userId }) { const { data, error } = await supabase.from('patrimony_assets').select('*').eq('user_id', userId).is('archived_at', null).order('created_at'); fail(error, 'assets_load_failed'); return data || []; }
export async function listDebts({ supabase, userId }) { const { data, error } = await supabase.from('patrimony_debts').select('*').eq('user_id', userId).is('archived_at', null).order('created_at'); fail(error, 'debts_load_failed'); return data || []; }
export async function getDebt({ supabase, userId, id }) { const { data, error } = await supabase.from('patrimony_debts').select('*').eq('id', id).eq('user_id', userId).is('archived_at', null).maybeSingle(); fail(error, 'debt_load_failed'); return data; }
export async function logChange({ supabase, userId, entityType, entityId, action, changes, actorId, actorRole }) { const { error } = await supabase.from('patrimony_change_log').insert({ user_id: userId, entity_type: entityType, entity_id: entityId, action, changes, changed_by: actorId, changed_by_role: actorRole }); fail(error, 'change_log_failed'); }

async function write({ supabase, table, entityType, userId, id, values, actorId, actorRole, action }) {
  let before = {}; if (id) before = (await supabase.from(table).select('*').eq('id', id).eq('user_id', userId).maybeSingle()).data || {};
  const query = id ? supabase.from(table).update(values).eq('id', id).eq('user_id', userId) : supabase.from(table).insert({ ...values, user_id: userId });
  const { data, error } = await query.select('*').single(); fail(error, `${entityType}_${action}_failed`);
  await logChange({ supabase, userId, entityType, entityId: data.id, action, changes: differences(before, data), actorId, actorRole }); return data;
}
export const createAsset = (args) => write({ ...args, table: 'patrimony_assets', entityType: 'asset', action: 'create', values: args.input });
export const updateAsset = (args) => write({ ...args, table: 'patrimony_assets', entityType: 'asset', action: 'update', values: args.input });
export const archiveAsset = (args) => write({ ...args, table: 'patrimony_assets', entityType: 'asset', action: 'archive', values: { archived_at: new Date().toISOString() } });
export const createDebt = (args) => write({ ...args, table: 'patrimony_debts', entityType: 'debt', action: 'create', values: args.input });
export const updateDebt = (args) => write({ ...args, table: 'patrimony_debts', entityType: 'debt', action: 'update', values: args.input });
export const archiveDebt = (args) => write({ ...args, table: 'patrimony_debts', entityType: 'debt', action: 'archive', values: { archived_at: new Date().toISOString() } });
export const payoffDebt = (args) => write({ ...args, table: 'patrimony_debts', entityType: 'debt', action: 'payoff', values: { status: 'quitada', paid_off_at: new Date().toISOString(), current_balance: 0 } });

export async function confirmEntity({ supabase, entityType, id, userId, actorId, actorRole }) {
  const table = entityType === 'asset' ? 'patrimony_assets' : 'patrimony_debts';
  return write({ supabase, table, entityType, id, userId, actorId, actorRole, action: 'confirm', values: { updated_at: new Date().toISOString() } });
}
export async function getSettings({ supabase, userId }) { const { data, error } = await supabase.from('patrimony_settings').select('*').eq('user_id', userId).maybeSingle(); fail(error, 'settings_load_failed'); return data || { user_id: userId, monthly_income: null, monthly_cost_of_living: null, reserve_target_months: 6, daily_bank: null }; }
export async function upsertSettings({ supabase, userId, input, actorId, actorRole }) { const before = await getSettings({ supabase, userId }); const values = { ...input, daily_bank: input.daily_bank ?? null }; const { data, error } = await supabase.from('patrimony_settings').upsert({ ...values, user_id: userId, updated_by: actorId }, { onConflict: 'user_id' }).select('*').single(); fail(error, 'settings_save_failed'); await logChange({ supabase, userId, entityType: 'settings', entityId: null, action: before?.updated_at ? 'update' : 'create', changes: differences(before, data), actorId, actorRole }); return data; }
export async function suggestSettingsFromFinance({ supabase, userId }) { const now = new Date(); const month = String(now.getMonth() + 1).padStart(2, '0'); const year = String(now.getFullYear()); const { data } = await supabase.from('financial_data').select('data').eq('user_id', userId).eq('month', month).eq('year', year).maybeSingle(); const finance = data?.data || {}; return { monthly_income: totalPrevisto(finance.receitas || []), monthly_cost_of_living: totalPrevistoContas(finance.contas || []) }; }
export async function getChangeHistory({ supabase, entityId, limit = 30 }) { const { data, error } = await supabase.from('patrimony_change_log').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(limit); fail(error, 'history_load_failed'); return data || []; }
