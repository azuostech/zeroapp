const STORAGE_KEY = 'zero_last_access_month';
const SESSION_LOCK_PREFIX = 'zero_first_launch_checked_';

function buildMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getSessionLockKey(monthKey) {
  return `${SESSION_LOCK_PREFIX}${monthKey}`;
}

export function getCurrentMonthMeta() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthKey: buildMonthKey(now)
  };
}

export function checkFirstLaunchOfMonth() {
  if (typeof window === 'undefined') return false;

  const { monthKey } = getCurrentMonthMeta();
  const lockKey = getSessionLockKey(monthKey);

  try {
    if (window.sessionStorage.getItem(lockKey) === '1') return false;
    window.sessionStorage.setItem(lockKey, '1');
  } catch (_) {
    // no-op
  }

  try {
    const lastAccessMonth = window.localStorage.getItem(STORAGE_KEY);
    if (lastAccessMonth === monthKey) return false;
    window.localStorage.setItem(STORAGE_KEY, monthKey);
    return true;
  } catch (_) {
    return false;
  }
}

export function resetFirstLaunchDetector() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    // no-op
  }

  try {
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(SESSION_LOCK_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch (_) {
    // no-op
  }
}

