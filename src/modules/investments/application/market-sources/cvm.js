import { unzipSync } from 'fflate';
import { csvLine, digits, fetchWithTimeout, normalizeHeader, parseApiNumber } from './source-utils';

const previousMonth = (month) => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() - 1); return date.toISOString().slice(0, 7); };

export async function fetchCvmQuotes({ cnpjs = [], month = new Date().toISOString().slice(0, 7), fetchImpl = fetch } = {}) {
  const wanted = new Set(cnpjs.map(digits).filter(Boolean));
  if (!wanted.size) return { rows: [], errors: [] };
  const errors = []; let response; let usedMonth = month;
  for (const candidate of [month, previousMonth(month)]) {
    const compact = candidate.replace('-', '');
    try {
      const current = await fetchWithTimeout(`https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_${compact}.zip`, {}, fetchImpl);
      if (current.ok) { response = current; usedMonth = candidate; break; }
      errors.push(`cvm_${compact}_${current.status}`);
    } catch (error) { errors.push(`cvm_${compact}_${error.name === 'AbortError' ? 'timeout' : 'fetch_failed'}`); }
  }
  if (!response) return { rows: [], errors };
  try {
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const csv = Object.entries(files).find(([name]) => name.toLowerCase().endsWith('.csv'))?.[1];
    if (!csv) return { rows: [], errors: [...errors, 'cvm_csv_missing'] };
    const lines = new TextDecoder('utf-8').decode(csv).split(/\n/);
    const headers = csvLine(lines.shift() || '').map(normalizeHeader);
    const latest = new Map();
    for (const line of lines) {
      if (!line.trim()) continue;
      const fields = csvLine(line); const row = Object.fromEntries(headers.map((header, index) => [header, fields[index]]));
      const cnpj = digits(row.cnpj_fundo_classe || row.cnpj_fundo); const quoteDate = row.dt_comptc; const price = parseApiNumber(row.vl_quota);
      if (!wanted.has(cnpj) || !/^\d{4}-\d{2}-\d{2}$/.test(quoteDate || '') || price == null) continue;
      if (!latest.has(cnpj) || quoteDate > latest.get(cnpj).quote_date) latest.set(cnpj, { source: 'cvm', symbol: cnpj, quote_date: quoteDate, price, meta: { month: usedMonth } });
    }
    return { rows: [...latest.values()], errors };
  } catch (_) { return { rows: [], errors: [...errors, 'cvm_invalid_zip'] }; }
}
