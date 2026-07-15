const ZEROAPP_STORAGE_PREFIXES = ['zeroapp:', 'zeroapp-', 'zero_'];

function clearMatchingKeys(storage) {
  if (!storage) return;
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && ZEROAPP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keys.push(key);
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function clearZeroAppClientStorage() {
  if (typeof window === 'undefined') return;
  try {
    clearMatchingKeys(window.localStorage);
  } catch (_) {
    // Storage pode estar indisponivel em modo privado/restrito.
  }
  try {
    clearMatchingKeys(window.sessionStorage);
  } catch (_) {
    // Storage pode estar indisponivel em modo privado/restrito.
  }
}
