export function roundCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : null;
}

export function parseBRL(input) {
  if (typeof input === 'number') return input >= 0 && Number.isFinite(input) ? roundCents(input) : null;
  if (typeof input !== 'string') return null;
  let value = input.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!value || value.startsWith('-') || !/^[\d.,]+$/.test(value)) return null;
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}\.\d{3}$/.test(value)) value = value.replace('.', '');
  else if ((value.match(/\./g) || []).length > 1) value = value.replace(/\./g, '');
  const number = Number(value);
  return number >= 0 && Number.isFinite(number) ? roundCents(number) : null;
}

export function parsePercent(input) {
  if (typeof input === 'number') return input >= 0 && Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const value = input.trim().replace('%', '').replace(',', '.');
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return number >= 0 && Number.isFinite(number) ? number : null;
}

export function formatBRL(value, { cents = true } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'R$ 0,00';
  const absolute = Math.abs(number).toLocaleString('pt-BR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  return `${number < 0 ? '-' : ''}R$ ${absolute}`;
}

export function formatCompactBRL(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'R$ 0';
  const sign = number < 0 ? '-' : '';
  const absolute = Math.abs(number);
  if (absolute >= 1_000_000) return `${sign}R$ ${(absolute / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}mi`;
  if (absolute >= 1_000) return `${sign}R$ ${(absolute / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return `${sign}R$ ${absolute.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value, digits = 1) {
  const number = Number(value);
  return `${(Number.isFinite(number) ? number : 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}
