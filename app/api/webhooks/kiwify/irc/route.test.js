import crypto from 'node:crypto';
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

  it('valida a assinatura HMAC-SHA1 enviada no corpo pela Kiwify', async () => {
    const token = 'segredo-do-webhook';
    const order = {
      order_id: 'order-1',
      order_status: 'paid',
      webhook_event_type: 'order_approved',
      Product: { product_id: 'produto-1' },
      Customer: { email: 'compradora@example.com' }
    };
    const signature = crypto.createHmac('sha1', token).update(JSON.stringify(order)).digest('hex');
    process.env.KIWIFY_IRC_WEBHOOK_TOKEN = token;
    mocks.provisionIrcPurchase.mockResolvedValue({ ok: true, user_id: 'user-1' });

    const response = await POST(new Request('https://www.zeroapp.tech/api/webhooks/kiwify/irc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature, order })
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true, ok: true, user_id: 'user-1' });
    expect(mocks.provisionIrcPurchase).toHaveBeenCalledWith({ signature, order });
  });
});
