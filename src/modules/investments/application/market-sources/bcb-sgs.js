import { brDateToIso, fetchWithTimeout, parseApiNumber } from './source-utils';

export const BCB_SERIES = { cdi: 12, selic: 11, ipca: 433, ptax_usd: 1 };
const isoToBr = (value) => `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
const shiftDays = (value, days) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const windowEnd = (from, to) => { const date = new Date(`${from}T00:00:00Z`); date.setUTCFullYear(date.getUTCFullYear() + 5); return [shiftDays(date.toISOString().slice(0, 10), -1), to].sort()[0]; };

export async function fetchBcbSeries({ series, from, to, fetchImpl = fetch }) {
  const code = BCB_SERIES[series];
  if (!code) return { rows: [], errors: ['bcb_series_invalid'] };
  const rows = []; const errors = [];
  for (let cursor = from; cursor <= to;) {
    const end = windowEnd(cursor, to);
    const query = new URLSearchParams({ formato: 'json', dataInicial: isoToBr(cursor), dataFinal: isoToBr(end) });
    try {
      const response = await fetchWithTimeout(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?${query}`, {}, fetchImpl);
      if (!response.ok) { errors.push(`bcb_${series}_${response.status}`); }
      else {
        const data = await response.json();
        for (const item of Array.isArray(data) ? data : []) {
          const value = parseApiNumber(item.valor); const refDate = brDateToIso(item.data);
          if (refDate && value != null) rows.push({ series, ref_date: series === 'ipca' ? `${refDate.slice(0, 7)}-01` : refDate, value });
        }
      }
    } catch (error) { errors.push(`bcb_${series}_${error.name === 'AbortError' ? 'timeout' : 'fetch_failed'}`); }
    cursor = shiftDays(end, 1);
  }
  return { rows, errors };
}
