import { brDateToIso, csvLine, fetchWithTimeout, normalizeHeader, parseNumber } from './source-utils';

async function readLines(response, onLine) {
  if (!response.body?.getReader) {
    for (const line of (await response.text()).split(/\n/)) onLine(line);
    return;
  }
  const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8'); let pending = '';
  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = pending.split(/\n/); pending = lines.pop() || '';
    for (const line of lines) onLine(line);
    if (done) break;
  }
  if (pending) onLine(pending);
}

export async function fetchTesouroPrices({ url = process.env.TESOURO_PRICES_CSV_URL, fetchImpl = fetch } = {}) {
  if (!url) return { rows: [], errors: ['tesouro_url_missing'] };
  try {
    const response = await fetchWithTimeout(url, {}, fetchImpl);
    if (!response.ok) return { rows: [], errors: [`tesouro_${response.status}`] };
    let headers = null; let latestDate = null; let rows = [];
    await readLines(response, (line) => {
      if (!line.trim()) return;
      const fields = csvLine(line);
      if (!headers) { headers = fields.map(normalizeHeader); return; }
      const row = Object.fromEntries(headers.map((header, index) => [header, fields[index]]));
      const quoteDate = brDateToIso(row['data base']);
      const maturity = row['data vencimento'];
      const price = parseNumber(row['pu venda manha']);
      if (!quoteDate || !maturity || price == null || !row['tipo titulo']) return;
      if (!latestDate || quoteDate > latestDate) { latestDate = quoteDate; rows = []; }
      if (quoteDate !== latestDate) return;
      rows.push({ source: 'tesouro', symbol: `${row['tipo titulo']}|${maturity}`, quote_date: quoteDate, price, meta: { puCompra: parseNumber(row['pu compra manha']), puBase: parseNumber(row['pu base manha']), taxaCompra: parseNumber(row['taxa compra manha']), taxaVenda: parseNumber(row['taxa venda manha']) } });
    });
    return { rows, errors: [] };
  } catch (error) { return { rows: [], errors: [`tesouro_${error.name === 'AbortError' ? 'timeout' : 'fetch_failed'}`] }; }
}
