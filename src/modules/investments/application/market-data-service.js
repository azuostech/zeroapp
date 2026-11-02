import { getServiceSupabase } from '@/src/lib/supabase/service';
import { fetchBcbSeries, BCB_SERIES } from './market-sources/bcb-sgs';
import { fetchBrapiQuotes } from './market-sources/brapi';
import { fetchTesouroPrices } from './market-sources/tesouro';
import { fetchCvmQuotes } from './market-sources/cvm';

const shiftDays = (value, days) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
async function saveRows(service, table, rows, onConflict) {
  if (!rows.length) return null;
  const { error } = await service.from(table).upsert(rows, { onConflict });
  return error?.message || null;
}

export async function syncIndices(service = getServiceSupabase(), today = new Date().toISOString().slice(0, 10)) {
  const result = { upserted: 0, errors: [] };
  for (const series of Object.keys(BCB_SERIES)) {
    const latest = await service.from('market_index_series').select('ref_date').eq('series', series).order('ref_date', { ascending: false }).limit(1).maybeSingle();
    if (latest.error) { result.errors.push(`index_latest_${series}:${latest.error.message}`); continue; }
    const from = latest.data?.ref_date ? shiftDays(latest.data.ref_date, 1) : '2016-01-01';
    if (from > today) continue;
    const fetched = await fetchBcbSeries({ series, from, to: today });
    result.errors.push(...fetched.errors);
    const error = await saveRows(service, 'market_index_series', fetched.rows, 'series,ref_date');
    if (error) result.errors.push(`index_save_${series}:${error}`); else result.upserted += fetched.rows.length;
  }
  return result;
}

export async function syncB3Quotes(service = getServiceSupabase()) {
  const positions = await service.from('investment_positions').select('ticker').eq('status', 'ativa').is('archived_at', null).eq('pricing_method', 'b3_quote').not('ticker', 'is', null);
  if (positions.error) return { upserted: 0, errors: [`b3_positions:${positions.error.message}`] };
  const fetched = await fetchBrapiQuotes((positions.data || []).map((item) => item.ticker));
  const error = await saveRows(service, 'market_quotes', fetched.rows, 'source,symbol,quote_date');
  return { upserted: error ? 0 : fetched.rows.length, errors: [...fetched.errors, ...(error ? [`b3_save:${error}`] : [])] };
}

export async function syncTesouro(service = getServiceSupabase()) {
  const fetched = await fetchTesouroPrices();
  const error = await saveRows(service, 'market_quotes', fetched.rows, 'source,symbol,quote_date');
  return { upserted: error ? 0 : fetched.rows.length, errors: [...fetched.errors, ...(error ? [`tesouro_save:${error}`] : [])] };
}

export async function syncCvm(service = getServiceSupabase()) {
  const positions = await service.from('investment_positions').select('cnpj').eq('status', 'ativa').is('archived_at', null).eq('pricing_method', 'cvm_quota').not('cnpj', 'is', null);
  if (positions.error) return { upserted: 0, errors: [`cvm_positions:${positions.error.message}`] };
  const fetched = await fetchCvmQuotes({ cnpjs: (positions.data || []).map((item) => item.cnpj) });
  const error = await saveRows(service, 'market_quotes', fetched.rows, 'source,symbol,quote_date');
  return { upserted: error ? 0 : fetched.rows.length, errors: [...fetched.errors, ...(error ? [`cvm_save:${error}`] : [])] };
}
