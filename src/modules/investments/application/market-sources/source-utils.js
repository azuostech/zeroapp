export const normalizeHeader = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');
export const digits = (value) => String(value || '').replace(/\D/g, '');
export const parseNumber = (value) => {
  const normalized = String(value ?? '').trim().replace(/\./g, '').replace(',', '.');
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
};
export const parseApiNumber = (value) => {
  const result = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(result) ? result : null;
};
export const brDateToIso = (value) => {
  const [day, month, year] = String(value || '').trim().split('/');
  return year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : null;
};
export const csvLine = (line, delimiter = ';') => {
  const fields = []; let current = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { fields.push(current); current = ''; }
    else current += char;
  }
  fields.push(current.replace(/\r$/, ''));
  return fields;
};
export async function fetchWithTimeout(url, options = {}, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try { return await fetchImpl(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
