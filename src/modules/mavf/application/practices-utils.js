const APP_TIME_ZONE = 'America/Sao_Paulo';

function formatDateKeyFromDate(date) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (_) {
    return date.toISOString().slice(0, 10);
  }
}

export function toDateKey(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKeyFromDate(date);
}

export function todayDateKey() {
  return toDateKey(new Date());
}

export function shiftDateKey(dateKey, deltaDays) {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map((part) => Number.parseInt(part, 10));

  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function calculateStreak(entries, getCreatedAt = (item) => item?.created_at) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;

  const seen = new Set();
  for (const entry of entries) {
    const key = toDateKey(getCreatedAt(entry));
    if (key) seen.add(key);
  }

  if (seen.size === 0) return 0;

  let streak = 0;
  let cursor = todayDateKey();

  while (cursor && seen.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

export function countSinceDays(entries, days, getCreatedAt = (item) => item?.created_at) {
  if (!Array.isArray(entries) || entries.length === 0) return 0;
  if (!Number.isInteger(days) || days <= 0) return 0;

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return entries.filter((entry) => {
    const createdAt = new Date(getCreatedAt(entry));
    return !Number.isNaN(createdAt.getTime()) && createdAt >= threshold;
  }).length;
}

export function parsePositiveLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
