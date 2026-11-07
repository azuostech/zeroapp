const text = (value) => String(value ?? '').trim();
const normalized = (value) => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const compact = (value) => normalized(value).replace(/[^a-z0-9]/g, '');

const number = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = text(value);
  if (!raw || raw === '-') return null;
  const clean = raw.replace(/R\$\s?/gi, '').replace(/\s/g, '');
  const decimal = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? parsed : null;
};

const isoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

const indexer = (value, product = '') => {
  const raw = normalized(`${value} ${product}`);
  if (/ipca/.test(raw)) return 'ipca';
  if (/selic/.test(raw)) return 'selic';
  if (/(^|\s)(di|cdi)(\s|$)/.test(raw)) return 'cdi';
  if (/prefix|pre-fix|pre fix/.test(raw)) return 'pre';
  if (/igpm|igp-m/.test(raw)) return 'igpm';
  return null;
};

const headerAliases = {
  product: ['produto', 'ativo'], institution: ['instituicao'], ticker: ['codigo de negociacao'],
  code: ['codigo'], isin: ['codigo isin', 'codigo isin / distribuicao'], quantity: ['quantidade'],
  value: ['valor atualizado'], value_curve: ['valor atualizado curva'], value_mtm: ['valor atualizado mtm'],
  value_close: ['valor atualizado fechamento'], value_gross: ['valor bruto'],
  maturity: ['vencimento'], indexer: ['indexador'], rate: ['taxa']
};

function headerMap(row) {
  const result = {};
  row.forEach((cell, index) => {
    const name = normalized(cell);
    for (const [key, aliases] of Object.entries(headerAliases)) if (result[key] == null && aliases.includes(name)) result[key] = index;
  });
  return result;
}

function findHeader(rows) {
  let best = null;
  rows.slice(0, 20).forEach((row, index) => {
    const map = headerMap(row);
    const score = ['product', 'institution', 'quantity', 'value', 'ticker', 'maturity'].filter((key) => map[key] != null).length;
    if (!best || score > best.score) best = { index, map, score };
  });
  return best?.score >= 3 && best.map.product != null && best.map.quantity != null ? best : null;
}

function sheetKind(name, map) {
  const sheet = normalized(name);
  if (/tesouro/.test(sheet) && map.isin != null) return 'tesouro';
  if (/renda fixa|cdb|lci|lca|debenture|cri|cra/.test(sheet) && map.maturity != null) return 'renda_fixa';
  if (/bdr/.test(sheet) && map.ticker != null) return 'bdr';
  if (/etf/.test(sheet) && map.ticker != null) return 'etf';
  if (/fii|fundo imobiliario/.test(sheet) && map.ticker != null) return 'fii';
  if (/fundo de investimento|fiagro/.test(sheet) && map.ticker != null) return 'fundo';
  if (/ac(ao|oes)|acoes/.test(sheet) && map.ticker != null) return 'acao';
  return null;
}

const at = (row, map, key) => map[key] == null ? '' : row[map[key]];
const isTotal = (row) => row.some((cell) => normalized(cell) === 'total');
const firstValue = (row, map, keys) => keys.map((key) => number(at(row, map, key))).find((value) => value != null);

function assetClass(kind, product, ticker) {
  if (kind !== 'fundo') return ({ renda_fixa: 'renda_fixa_bancaria' })[kind] || kind;
  const raw = normalized(product);
  if (/fiagro|fii|imobili/.test(raw) || /11$/.test(text(ticker))) return 'fii';
  return 'fundo';
}

function parseRow(row, map, kind) {
  const product = text(at(row, map, 'product'));
  const ticker = text(at(row, map, 'ticker')).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const quantity = number(at(row, map, 'quantity'));
  const value = firstValue(row, map, ['value', 'value_curve', 'value_mtm', 'value_close', 'value_gross']);
  if (!product || isTotal(row) || (quantity == null && value == null)) return null;
  const item = {
    asset_class: assetClass(kind, product, ticker), name: product.slice(0, 80), institution: text(at(row, map, 'institution')).slice(0, 80),
    quantity, value: value ?? 0
  };
  if (kind === 'tesouro') item.tesouro_code = text(at(row, map, 'isin') || at(row, map, 'code')).slice(0, 80);
  else if (ticker && kind !== 'renda_fixa') item.ticker = ticker.slice(0, 12);
  const maturity = isoDate(at(row, map, 'maturity')); if (maturity) item.maturity_date = maturity;
  const parsedIndexer = indexer(at(row, map, 'indexer'), product); if (parsedIndexer) item.indexer = parsedIndexer;
  const rate = number(at(row, map, 'rate')); if (rate != null) item.rate = rate;
  return item;
}

export function parseB3Position({ sheets = [] } = {}) {
  const items = []; const warnings = [];
  for (const sheet of sheets) {
    const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
    const header = findHeader(rows);
    const kind = header ? sheetKind(sheet.name, header.map) : null;
    if (!header || !kind) { warnings.push({ sheet: text(sheet?.name), reason: 'unrecognized' }); continue; }
    rows.slice(header.index + 1).forEach((row) => { const item = parseRow(row, header.map, kind); if (item) items.push({ ...item, sheet: text(sheet.name) }); });
  }
  return { items: items.map((item, index) => ({ id: `b3-${index + 1}`, ...item })), warnings };
}

const sameNumber = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 1e-8;
const days = (a, b) => Math.abs((new Date(`${a}T00:00:00Z`) - new Date(`${b}T00:00:00Z`)) / 86400000);
const fixedIncome = (item) => ['renda_fixa_bancaria', 'debenture_cri_cra'].includes(item.asset_class);
const positionKey = (item) => item.ticker ? `ticker:${compact(item.ticker)}` : item.tesouro_code ? `tesouro:${compact(item.tesouro_code)}` : fixedIncome(item) ? `rf:${compact(item.institution)}:${compact(item.name)}:${item.maturity_date || ''}` : null;

function similarManual(item, positions) {
  if (!fixedIncome(item)) return null;
  return positions.find((position) => {
    if (!fixedIncome(position) || !['manual', 'estimado'].includes(position.current_value_source) && position.pricing_method !== 'manual') return false;
    if (compact(position.institution) !== compact(item.institution)) return false;
    const sameProduct = compact(position.name) === compact(item.name) || compact(position.product) === compact(item.name);
    const closeMaturity = position.maturity_date && item.maturity_date && days(position.maturity_date, item.maturity_date) <= 31;
    return sameProduct || closeMaturity;
  }) || null;
}

export function reconcileImport({ items = [], positions = [] } = {}) {
  const byKey = new Map(positions.map((position) => [positionKey(position), position]).filter(([key]) => key));
  return items.map((item) => {
    const exact = byKey.get(positionKey(item));
    if (exact) return { ...item, status: sameNumber(item.quantity, exact.quantity) ? 'IGUAL' : 'ATUALIZAR', existing_position_id: exact.id };
    const similar = similarManual(item, positions);
    if (similar) return { ...item, status: 'CONFIRMAR', existing_position_id: similar.id };
    return { ...item, status: 'NOVO' };
  });
}

export const b3Internals = { normalized, number, isoDate, findHeader, positionKey };
