import ExcelJS from 'exceljs';
import { parseB3Position, reconcileImport } from '../domain/investments.b3';
import { awardInvestmentClaims } from './investments-coins';
import { revalueUser } from './investments-valuation-service';

const fail = (error, fallback) => { if (error) throw new Error(error.message || fallback); };
const today = () => new Date().toISOString().slice(0, 10);
const round = (value) => Math.round(Number(value || 0) * 100) / 100;

export async function workbookSheets(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.map((sheet) => ({
    name: sheet.name,
    rows: Array.from({ length: sheet.rowCount }, (_, index) => sheet.getRow(index + 1).values.slice(1).map((value) => value instanceof Date ? value : value?.text ?? value?.result ?? value ?? ''))
  }));
}

export async function previewB3Import({ buffer, positions = [] }) {
  const parsed = parseB3Position({ sheets: await workbookSheets(buffer) });
  return { previewId: crypto.randomUUID(), items: reconcileImport({ items: parsed.items, positions }), warnings: parsed.warnings };
}

const pricingMethod = (item) => {
  if (['acao', 'fii', 'etf', 'bdr'].includes(item.asset_class)) return 'b3_quote';
  if (item.asset_class === 'tesouro') return 'tesouro_price';
  if (item.asset_class === 'fundo') return 'manual';
  return ({ cdi: 'cdi_curve', selic: 'selic_curve', pre: 'pre_curve', ipca: 'ipca_curve' })[item.indexer] || 'manual';
};
const guarantee = (item) => item.asset_class === 'tesouro' ? 'tesouro' : /\b(CDB|LCI|LCA)\b/i.test(item.name || '') ? 'fgc' : 'desconhecida';

export function importedPosition(item, userId) {
  const method = pricingMethod(item); const value = Math.max(0, round(item.value));
  return {
    user_id: userId, goal_id: item.goal_id, asset_class: item.asset_class, name: String(item.name || '').slice(0, 80),
    ticker: item.ticker || null, tesouro_code: item.tesouro_code || null, institution: String(item.institution || '').slice(0, 80) || null,
    indexer: item.indexer || null, rate: item.rate ?? null, quantity: item.quantity ?? null, maturity_date: item.maturity_date || null,
    pricing_method: method, guarantee: guarantee(item), manual_value: method === 'manual' ? value : null,
    manual_value_at: method === 'manual' ? new Date().toISOString() : null, current_value: value, current_value_at: new Date().toISOString(),
    current_value_source: 'b3', invested_amount: value
  };
}

const ASSET_CLASSES = new Set(['tesouro', 'renda_fixa_bancaria', 'debenture_cri_cra', 'fundo', 'acao', 'fii', 'etf', 'bdr']);
function validateItems(items, positions, goals) {
  if (!Array.isArray(items) || !items.length || items.length > 1000) throw Object.assign(new Error('items_invalid'), { status: 400 });
  const positionIds = new Set(positions.map((item) => item.id)); const goalIds = new Set(goals.map((item) => item.id));
  for (const item of items) {
    if (!['NOVO', 'ATUALIZAR', 'IGUAL', 'CONFIRMAR'].includes(item.status)) throw Object.assign(new Error('status_invalid'), { status: 400 });
    const creates = item.status === 'NOVO' || item.status === 'CONFIRMAR' && item.resolution === 'other';
    if (creates && !item.goal_id) throw Object.assign(new Error(`goal_required:${item.ticker || item.name || 'item'}`), { status: 400 });
    if (creates && !goalIds.has(item.goal_id)) throw Object.assign(new Error('goal_not_found'), { status: 404 });
    if (creates && (!ASSET_CLASSES.has(item.asset_class) || !String(item.name || '').trim() || !Number.isFinite(Number(item.value)) || Number(item.value) < 0 || item.quantity != null && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0))) throw Object.assign(new Error('item_invalid'), { status: 400 });
    if (creates && item.ticker && !/^[A-Z0-9]{4,12}$/.test(item.ticker)) throw Object.assign(new Error('ticker_invalid'), { status: 400 });
    if (item.status === 'CONFIRMAR' && !['same', 'other'].includes(item.resolution)) throw Object.assign(new Error('confirmation_required'), { status: 400 });
    if (!creates && item.status !== 'NOVO' && item.existing_position_id && !positionIds.has(item.existing_position_id)) throw Object.assign(new Error('position_not_found'), { status: 404 });
  }
}

export async function commitB3Import({ supabase, userId, items, fileName }) {
  const [listed, goalsResult] = await Promise.all([
    supabase.from('investment_positions').select('*').eq('user_id', userId).is('archived_at', null),
    supabase.from('investment_goals').select('id').eq('user_id', userId).is('archived_at', null)
  ]); fail(listed.error, 'positions_load_failed'); fail(goalsResult.error, 'goals_load_failed');
  const positions = listed.data || []; validateItems(items, positions, goalsResult.data || []);
  const creates = items.filter((item) => item.status === 'NOVO' || item.status === 'CONFIRMAR' && item.resolution === 'other');
  const updates = items.filter((item) => item.status === 'ATUALIZAR' || item.status === 'CONFIRMAR' && item.resolution === 'same');
  const summary = items.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {});
  const batch = await supabase.from('investment_import_batches').insert({
    user_id: userId, file_name: String(fileName || '').slice(0, 120) || null, rows_total: items.length,
    rows_imported: creates.length + updates.length, summary
  }).select('*').single(); fail(batch.error, 'import_batch_create_failed');
  let imported = 0;
  for (const item of creates) {
    const position = await supabase.from('investment_positions').insert(importedPosition(item, userId)).select('*').single(); fail(position.error, 'position_create_failed');
    const movement = await supabase.from('investment_movements').insert({
      user_id: userId, position_id: position.data.id, kind: 'aporte', amount: Math.max(0.01, round(item.value)), quantity: item.quantity ?? null,
      occurred_on: today(), source: 'b3_import', import_batch_id: batch.data.id
    }); fail(movement.error, 'movement_create_failed'); imported += 1;
  }
  const byId = new Map(positions.map((item) => [item.id, item]));
  for (const item of updates) {
    const current = byId.get(item.existing_position_id); if (!current) throw Object.assign(new Error('position_not_found'), { status: 404 });
    const quantityDelta = item.quantity == null || current.quantity == null ? null : Number(item.quantity) - Number(current.quantity);
    const saved = await supabase.from('investment_positions').update({ quantity: item.quantity ?? current.quantity, current_value: Math.max(0, round(item.value)), current_value_at: new Date().toISOString(), current_value_source: 'b3' }).eq('id', current.id).eq('user_id', userId); fail(saved.error, 'position_update_failed');
    const movement = await supabase.from('investment_movements').insert({
      user_id: userId, position_id: current.id, kind: 'ajuste', amount: 0, quantity: quantityDelta,
      occurred_on: today(), source: 'b3_import', import_batch_id: batch.data.id
    }); fail(movement.error, 'movement_create_failed'); imported += 1;
  }
  let revaluation = { ok: true };
  try { await revalueUser(userId); } catch (error) { revaluation = { ok: false, reason: error.message }; }
  let coins = { awarded: [], balance: null };
  if (!positions.length && creates.length) {
    try { coins = await awardInvestmentClaims({ userId, claims: [{ key: 'first', action: 'investment_first', amount: 100 }] }); }
    catch (error) { coins = { awarded: false, reason: error.message }; }
  }
  return { batch: batch.data, imported, coins, revaluation };
}
