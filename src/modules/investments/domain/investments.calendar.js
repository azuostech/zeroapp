const parseUtc = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);
const formatUtc = (date) => date.toISOString().slice(0, 10);
const shiftDays = (dateStr, days) => {
  const date = parseUtc(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtc(date);
};

export function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function nationalHolidays(year) {
  const fixed = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
  const easter = easterDate(year);
  return new Set([
    ...fixed.map((day) => `${year}-${day}`),
    shiftDays(easter, -48),
    shiftDays(easter, -47),
    shiftDays(easter, -2),
    shiftDays(easter, 60)
  ]);
}

export function isBusinessDay(dateStr) {
  const date = parseUtc(dateStr);
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !nationalHolidays(date.getUTCFullYear()).has(dateStr);
}

export function businessDaysBetween(fromStr, toStr) {
  if (!fromStr || !toStr || toStr <= fromStr) return 0;
  let count = 0;
  for (let cursor = shiftDays(fromStr, 1); cursor <= toStr; cursor = shiftDays(cursor, 1)) {
    if (isBusinessDay(cursor)) count += 1;
  }
  return count;
}

export function addMonths(dateStr, months) {
  const date = parseUtc(dateStr);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return formatUtc(date);
}

export function monthsBetween(fromStr, toStr) {
  const from = parseUtc(fromStr);
  const to = parseUtc(toStr);
  return Math.max(0, (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth());
}

export function firstDayOfMonth(dateStr) {
  return `${String(dateStr).slice(0, 7)}-01`;
}
