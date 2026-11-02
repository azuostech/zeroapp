import { computeBalanceSheet } from '../domain/patrimony.balance';
import { computeMetrics } from '../domain/patrimony.calculations';
import { sendPushToUser } from '@/src/lib/push/push-service';

const fail = (error, fallback) => { if (error) throw new Error(error.message || fallback); };

export async function eligiblePatrimonyUserIds(service, days = 90) {
  const since = new Date(Date.now() - days * 86400000).toISOString(); const ids = new Set();
  for (const table of ['patrimony_debts', 'patrimony_assets', 'patrimony_milestones', 'investment_positions']) {
    const column = table === 'patrimony_milestones' ? 'created_at' : 'updated_at';
    const { data, error } = await service.from(table).select('user_id').gte(column, since); fail(error, `${table}_eligible_failed`);
    for (const row of data || []) ids.add(row.user_id);
  }
  return [...ids];
}

async function loadState(service, userId) {
  const [assets, debts, settings] = await Promise.all([
    service.from('patrimony_assets').select('*').eq('user_id', userId).is('archived_at', null),
    service.from('patrimony_debts').select('*').eq('user_id', userId).is('archived_at', null),
    service.from('patrimony_settings').select('*').eq('user_id', userId).maybeSingle()
  ]);
  fail(assets.error, 'assets_load_failed'); fail(debts.error, 'debts_load_failed'); fail(settings.error, 'settings_load_failed');
  return { assets: assets.data || [], debts: debts.data || [], settings: settings.data || { reserve_target_months: 6 } };
}

export async function createMonthlySnapshots(service, now = new Date()) {
  const users = await eligiblePatrimonyUserIds(service); const result = { processed: 0, skipped: 0, errors: [] };
  const month = `${now.toISOString().slice(0, 7)}-01`; const today = now.toISOString().slice(0, 10);
  for (const userId of users) {
    try { const state = await loadState(service, userId); const metrics = { ...computeMetrics(state), balance: computeBalanceSheet({ ...state, positions: [], today }) }; const saved = await service.from('patrimony_monthly_snapshots').upsert({ user_id: userId, month, metrics }, { onConflict: 'user_id,month' }); fail(saved.error, 'snapshot_save_failed'); result.processed += 1; } catch (error) { result.errors.push({ user_id: userId, error: error.message }); }
  }
  return result;
}

export async function sendPatrimonyReminders(service) {
  const users = await eligiblePatrimonyUserIds(service); let sent = 0; let skipped = 0; const staleBefore = new Date(Date.now() - 30 * 86400000).toISOString();
  for (const userId of users) {
    const [assets, debts] = await Promise.all([service.from('patrimony_assets').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('archived_at', null).lt('updated_at', staleBefore), service.from('patrimony_debts').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('archived_at', null).lt('updated_at', staleBefore)]);
    if (!(assets.count || debts.count)) { skipped += 1; continue; }
    try { await sendPushToUser(userId, { title: 'Hora de atualizar seu patrimônio', body: 'Confira os saldos das suas dívidas e bens.', url: '/financas/patrimonio' }); sent += 1; } catch (_) { skipped += 1; }
  }
  return { sent, skipped };
}
