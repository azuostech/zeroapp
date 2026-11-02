import { fetchWithTimeout } from './source-utils';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchBrapiQuotes(tickers = [], { token = process.env.BRAPI_TOKEN, fetchImpl = fetch, delay = wait } = {}) {
  if (!token) return { rows: [], errors: ['brapi_token_missing'] };
  const rows = []; const errors = [];
  const unique = [...new Set(tickers.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean))];
  for (let index = 0; index < unique.length; index += 1) {
    const ticker = unique[index];
    try {
      const response = await fetchWithTimeout(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, { headers: { Authorization: `Bearer ${token}` } }, fetchImpl);
      const body = response.ok ? await response.json() : null;
      const quote = body?.results?.[0];
      if (!response.ok || !quote || !Number.isFinite(Number(quote.regularMarketPrice))) errors.push(`brapi_${ticker}_${response.status || 'invalid'}`);
      else rows.push({ source: 'brapi', symbol: ticker, quote_date: String(quote.regularMarketTime || new Date().toISOString()).slice(0, 10), price: Number(quote.regularMarketPrice), meta: { regularMarketTime: quote.regularMarketTime || null } });
    } catch (error) { errors.push(`brapi_${ticker}_${error.name === 'AbortError' ? 'timeout' : 'fetch_failed'}`); }
    if (index < unique.length - 1) await delay(300);
  }
  return { rows, errors };
}
