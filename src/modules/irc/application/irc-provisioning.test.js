import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  sendEmail: vi.fn(),
  from: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/src/lib/email/email-service', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/src/lib/email/templates/irc-access', () => ({
  ircAccessEmail: vi.fn(() => ({ subject: 'Acesso ao Diagnóstico', html: '<p>Acesso</p>' }))
}));
vi.mock('@/src/lib/supabase/service', () => ({
  getServiceSupabase: () => ({
    auth: { admin: { generateLink: mocks.generateLink } },
    from: mocks.from
  })
}));
vi.mock('@/src/modules/irc/domain/irc-domains', () => ({
  IRC_PRODUCT_CODE: 'diagnostico_completo',
  IRC_SOURCE: 'kiwify_irc',
  IRC_TURMA: 'diagnostico'
}));
vi.mock('@/src/modules/irc/domain/kiwify-event', async () => import('../domain/kiwify-event.js'));

import { provisionIrcPurchase } from './irc-provisioning';

function query(result, calls) {
  const chain = {};
  for (const method of ['insert', 'select', 'update', 'eq', 'ilike', 'upsert', 'in', 'contains', 'limit']) {
    chain[method] = vi.fn((...args) => {
      calls.push([method, ...args]);
      return chain;
    });
  }
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('provisionamento pós-compra do Diagnóstico Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIWIFY_IRC_PRODUCT_IDS = 'produto-diagnostico';
    delete process.env.KIWIFY_IRC_CHECKOUT_LINKS;
    delete process.env.NEXT_PUBLIC_IRC_CHECKOUT_URL;
  });

  it('cria a conta e libera diagnóstico, tag e e-mail para uma compra aprovada', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const purchaseId = 'compra-teste-1';
    const calls = new Map();
    const responses = {
      commerce_webhook_events: [
        { data: { id: 'evento-1', status: 'processing' }, error: null },
        { data: null, error: null }
      ],
      product_access: [
        { data: null, error: null },
        { data: { id: 'acesso-1', status: 'active' }, error: null }
      ],
      profiles: [
        { data: null, error: null },
        {
          data: {
            id: userId,
            email: 'compradora@example.com',
            full_name: 'Compradora Teste',
            phone: '5511999999999',
            status: 'active',
            tier: 'DESPERTAR',
            turma: 'diagnostico'
          },
          error: null
        }
      ],
      user_tags: [{ data: null, error: null }],
      email_logs: [{ data: null, error: null }]
    };

    mocks.from.mockImplementation((table) => {
      const tableCalls = calls.get(table) || [];
      calls.set(table, tableCalls);
      return query(responses[table].shift(), tableCalls);
    });
    mocks.generateLink.mockResolvedValue({
      data: {
        user: { id: userId },
        properties: { action_link: 'https://auth.example.com/definir-senha' }
      },
      error: null
    });
    mocks.sendEmail.mockResolvedValue({ success: true, id: 'email-1' });

    const result = await provisionIrcPurchase({
      signature: 'segredo-validado-pela-rota',
      order: {
        order_id: purchaseId,
        webhook_event_type: 'order_approved',
        order_status: 'paid',
        Product: { product_id: 'produto-diagnostico' },
        Customer: {
          email: ' COMPRADORA@EXAMPLE.COM ',
          full_name: 'Compradora Teste',
          mobile: '5511999999999'
        }
      }
    });

    expect(result).toMatchObject({
      ok: true,
      user_id: userId,
      entitlement_id: 'acesso-1',
      invited: true
    });
    expect(mocks.generateLink).toHaveBeenCalledWith(expect.objectContaining({
      type: 'invite',
      email: 'compradora@example.com'
    }));
    expect(calls.get('profiles')).toContainEqual([
      'update',
      expect.objectContaining({ status: 'active', tier: 'DESPERTAR', turma: 'diagnostico' })
    ]);
    expect(calls.get('product_access')).toContainEqual([
      'upsert',
      expect.objectContaining({
        user_id: userId,
        product_code: 'diagnostico_completo',
        purchase_id: purchaseId,
        status: 'active'
      }),
      { onConflict: 'source,purchase_id,product_code' }
    ]);
    expect(calls.get('user_tags')).toContainEqual([
      'upsert',
      { user_id: userId, tag: 'ChatQuiz', source: 'kiwify_irc' },
      { onConflict: 'user_id,tag', ignoreDuplicates: true }
    ]);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      to: 'compradora@example.com',
      emailType: 'irc_access_invite',
      emailSnapshot: expect.objectContaining({ purchase_id: purchaseId })
    }));
  });
});
