const PROFILE_TTL_MS = 30_000;

let cachedProfile = null;
let cachedAt = 0;
let inflight = null;

export async function fetchCurrentProfile({ force = false } = {}) {
  const fresh = cachedProfile && Date.now() - cachedAt < PROFILE_TTL_MS;
  if (!force && fresh) return cachedProfile;
  if (!force && inflight) return inflight;

  inflight = fetch('/api/profile/me', { cache: 'no-store' })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'profile_load_failed');
      cachedProfile = payload?.profile || null;
      cachedAt = Date.now();
      return cachedProfile;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function primeCurrentProfile(profile) {
  if (!profile) return;
  cachedProfile = profile;
  cachedAt = Date.now();
}

export function clearCurrentProfileCache() {
  cachedProfile = null;
  cachedAt = 0;
  inflight = null;
}
