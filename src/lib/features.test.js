import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadShamarFlag() {
  vi.resetModules();
  return (await import('./features.js')).SHAMAR_ENABLED;
}

async function loadInvestmentsFlag() {
  vi.resetModules();
  return (await import('./features.js')).INVESTMENTS_ENABLED;
}

describe('SHAMAR_ENABLED', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fica desligada quando a variável não existe', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SHAMAR', undefined);
    expect(await loadShamarFlag()).toBe(false);
  });

  it('fica ligada somente com o valor true', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SHAMAR', 'true');
    expect(await loadShamarFlag()).toBe(true);
  });

  it('não aceita 1 como valor ligado', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SHAMAR', '1');
    expect(await loadShamarFlag()).toBe(false);
  });
});

describe('INVESTMENTS_ENABLED', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fica desligada quando a variável não existe', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_INVESTMENTS', undefined);
    expect(await loadInvestmentsFlag()).toBe(false);
  });

  it('fica ligada somente com o valor true', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_INVESTMENTS', 'true');
    expect(await loadInvestmentsFlag()).toBe(true);
  });

  it('não aceita 1 como valor ligado', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_INVESTMENTS', '1');
    expect(await loadInvestmentsFlag()).toBe(false);
  });
});
