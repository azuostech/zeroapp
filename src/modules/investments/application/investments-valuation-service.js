import { getServiceSupabase } from '@/src/lib/supabase/service';
import { curveValue, investedAmount, marketValue } from '../domain/investments.valuation';
import { firstDayOfMonth } from '../domain/investments.calendar';

const digits = (value) => String(value || '').replace(/\D/g, '');
const curveMethod = (position) => ({ cdi: 'cdi_curve', selic: 'selic_curve', pre: 'pre_curve', ipca: 'ipca_curve' })[position.indexer];
const sourceName = (source) => ({ brapi: 'b3', tesouro: 'tesouro', cvm: 'cvm' })[source] || source;

export function revaluePosition(position, { quotes = [], series = [], movements = [], asOf }) {
  const positionMovements = movements.filter((item) => item.position_id === position.id);
  const invested = investedAmount(positionMovements);
  const result = { invested_amount: invested };
  const method = position.pricing_method;
  const bySeries = (name) => series.filter((item) => item.series === name);
  let curve = null;

  if (['cdi_curve', 'selic_curve', 'pre_curve', 'ipca_curve'].includes(method)) {
    const seriesName = method === 'cdi_curve' ? 'cdi' : method === 'selic_curve' ? 'selic' : null;
    curve = curveValue({ movements: positionMovements, method, rate: position.rate, series: seriesName ? bySeries(seriesName) : [], ipcaMonthly: bySeries('ipca'), asOf });
  } else if (method === 'tesouro_price' && curveMethod(position) && position.rate != null) {
    const nextMethod = curveMethod(position);
    const seriesName = nextMethod === 'selic_curve' ? 'selic' : nextMethod === 'cdi_curve' ? 'cdi' : null;
    curve = curveValue({ movements: positionMovements, method: nextMethod, rate: position.rate, series: seriesName ? bySeries(seriesName) : [], ipcaMonthly: bySeries('ipca'), asOf });
  }
  if (curve) Object.assign(result, { curve_value: curve.value, curve_value_at: `${curve.asOf}T00:00:00.000Z` });

  if (method === 'manual' && position.manual_value != null) {
    Object.assign(result, { current_value: Number(position.manual_value), current_value_source: 'manual', current_value_at: position.manual_value_at || `${asOf}T00:00:00.000Z` });
  } else {
    const symbol = method === 'b3_quote' ? position.ticker : method === 'tesouro_price' ? position.tesouro_code : method === 'cvm_quota' ? digits(position.cnpj) : null;
    const source = method === 'b3_quote' ? 'brapi' : method === 'tesouro_price' ? 'tesouro' : method === 'cvm_quota' ? 'cvm' : null;
    const quote = quotes.filter((item) => item.source === source && item.symbol === symbol).sort((a, b) => b.quote_date.localeCompare(a.quote_date))[0];
    if (quote && position.quantity != null) Object.assign(result, { current_value: marketValue({ quantity: position.quantity, price: quote.price }), current_value_source: sourceName(quote.source), current_value_at: `${quote.quote_date}T00:00:00.000Z` });
    else if (method === 'fx_ptax' && position.quantity != null) {
      const ptax = bySeries('ptax_usd').filter((item) => item.ref_date <= asOf).sort((a, b) => b.ref_date.localeCompare(a.ref_date))[0];
      if (ptax) Object.assign(result, { current_value: marketValue({ quantity: position.quantity, price: ptax.value }), current_value_source: 'bcb', current_value_at: `${ptax.ref_date}T00:00:00.000Z` });
    } else if (curve) Object.assign(result, { current_value: curve.value, current_value_source: 'estimado', current_value_at: `${curve.asOf}T00:00:00.000Z` });
  }

  const finalValue = result.current_value ?? Number(position.current_value || 0);
  if (position.quantity != null && Number(position.quantity) === 0 && finalValue === 0) result.status = 'encerrada';
  return result;
}

async function loadValuationData(service, userId) {
  const [positions, movements, quotes, series] = await Promise.all([
    service.from('investment_positions').select('*').eq('user_id', userId).eq('status', 'ativa').is('archived_at', null),
    service.from('investment_movements').select('*').eq('user_id', userId).order('occurred_on'),
    service.from('market_quotes').select('*'),
    service.from('market_index_series').select('*').order('ref_date')
  ]);
  for (const result of [positions, movements, quotes, series]) if (result.error) throw new Error(result.error.message);
  return { positions: positions.data || [], movements: movements.data || [], quotes: quotes.data || [], series: series.data || [] };
}

export async function revalueUser(userId, service = getServiceSupabase(), asOf = new Date().toISOString().slice(0, 10)) {
  const data = await loadValuationData(service, userId); const result = { updated: 0, errors: [] };
  for (const position of data.positions) {
    const values = revaluePosition(position, { ...data, asOf });
    const saved = await service.from('investment_positions').update(values).eq('id', position.id).eq('user_id', userId);
    if (saved.error) result.errors.push({ id: position.id, error: saved.error.message }); else result.updated += 1;
  }
  return result;
}

export async function revalueAll(service = getServiceSupabase(), asOf = new Date().toISOString().slice(0, 10)) {
  const listed = await service.from('investment_positions').select('user_id').eq('status', 'ativa').is('archived_at', null);
  if (listed.error) throw new Error(listed.error.message);
  const users = [...new Set((listed.data || []).map((item) => item.user_id))]; const result = { users: 0, updated: 0, errors: [] };
  for (let offset = 0; offset < users.length; offset += 200) {
    for (const userId of users.slice(offset, offset + 200)) {
      try { const current = await revalueUser(userId, service, asOf); result.users += 1; result.updated += current.updated; result.errors.push(...current.errors); }
      catch (error) { result.errors.push({ user_id: userId, error: error.message }); }
    }
  }
  return result;
}

const nextMonth = (month) => { const date = new Date(`${month}T00:00:00.000Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 10); };

export async function buildPositionSeries({ supabase, position, movements = [], monthly = [], today = new Date().toISOString().slice(0, 10) }) {
  const first = [...movements].filter((item) => item.kind === 'aporte').sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))[0];
  if (!first) return [];
  const loaded = await supabase.from('market_index_series').select('*').order('ref_date');
  if (loaded.error) throw new Error(loaded.error.message);
  let month = firstDayOfMonth(first.occurred_on);
  if (first.occurred_on > month) month = nextMonth(month);
  const last = firstDayOfMonth(today);
  const snapshots = new Map(monthly.map((item) => [item.month, item]));
  const points = [];
  while (month <= last) {
    const relevantMovements = movements.filter((item) => item.occurred_on <= month);
    const calculated = revaluePosition(position, { series: loaded.data || [], quotes: [], movements: relevantMovements, asOf: month });
    const snapshot = snapshots.get(month);
    points.push({ month, curve: calculated.curve_value ?? snapshot?.curve_value ?? null, market: snapshot?.value ?? null });
    month = nextMonth(month);
  }
  return points;
}

export async function snapshotMonthlyValues(month, service = getServiceSupabase()) {
  const positions = await service.from('investment_positions').select('id,user_id,current_value,curve_value,invested_amount').eq('status', 'ativa').is('archived_at', null);
  if (positions.error) throw new Error(positions.error.message);
  const rows = (positions.data || []).map((item) => ({ position_id: item.id, user_id: item.user_id, month, value: item.current_value, curve_value: item.curve_value, invested_amount: item.invested_amount }));
  if (!rows.length) return { upserted: 0, errors: [] };
  const saved = await service.from('investment_monthly_values').upsert(rows, { onConflict: 'position_id,month' });
  return { upserted: saved.error ? 0 : rows.length, errors: saved.error ? [saved.error.message] : [] };
}
