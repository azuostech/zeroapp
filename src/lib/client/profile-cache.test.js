import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCurrentProfileCache, fetchCurrentProfile, primeCurrentProfile } from './profile-cache';

afterEach(() => {
  clearCurrentProfileCache();
  vi.unstubAllGlobals();
});

describe('profile-cache', () => {
  it('deduplica chamadas simultâneas ao perfil', async () => {
    const profile = { id: 'user-1', tier: 'MOVIMENTO' };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ profile })
    }));
    vi.stubGlobal('fetch', fetchMock);

    const [first, second, third] = await Promise.all([
      fetchCurrentProfile(),
      fetchCurrentProfile(),
      fetchCurrentProfile()
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(profile);
    expect(second).toEqual(profile);
    expect(third).toEqual(profile);
  });

  it('reutiliza perfil previamente carregado', async () => {
    const profile = { id: 'user-2', tier: 'DESPERTAR' };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    primeCurrentProfile(profile);

    await expect(fetchCurrentProfile()).resolves.toEqual(profile);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
