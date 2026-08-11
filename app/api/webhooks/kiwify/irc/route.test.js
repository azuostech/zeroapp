import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ provisionIrcPurchase: vi.fn() }));

vi.mock('@/src/modules/irc/application/irc-provisioning', () => ({
  provisionIrcPurchase: mocks.provisionIrcPurchase
}));

import { POST } from './route';

describe('autenticação do webhook Kiwify IRC', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.KIWIFY_IRC_WEBHOOK_TOKEN;
    delete process.env.KIWIFY_WEBHOOK_TOKEN;
  });

  it('aceita o segredo compartilhado quando também existe um segredo exclusivo', async () => {
    process.env.KIWIFY_IRC_WEBHOOK_TOKEN = 'segredo-irc';
    process.env.KIWIFY_WEBHOOK_TOKEN = 'segredo-compartilhado';
    mocks.provisionIrcPurchase.mockResolvedValue({ ok: true, ignored: true });

    const response = await POST(new Request('https://www.zeroapp.tech/api/webhooks/kiwify/irc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kiwify-token': 'segredo-compartilhado'
      },
      body: JSON.stringify({ event: 'integration_probe' })
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true, ok: true, ignored: true });
    expect(mocks.provisionIrcPurchase).toHaveBeenCalledOnce();
  });
});
