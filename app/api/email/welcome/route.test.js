import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  sendEmail: vi.fn()
}));

vi.mock('@/src/lib/supabase/service', () => ({
  getServiceSupabase: () => ({ from: mocks.from })
}));
vi.mock('@/src/lib/email/email-service', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/src/lib/email/templates/welcome-lead', () => ({
  welcomeLeadTemplate: () => ({ subject: 'Boas-vindas', html: '<p>Boas-vindas</p>' })
}));

import { POST } from './route';

function query(result) {
  const chain = {};
  for (const method of ['select', 'ilike', 'eq', 'in', 'limit']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

describe('e-mail de boas-vindas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não envia novamente quando já existe boas-vindas entregue', async () => {
    mocks.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return query({
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'compradora@example.com',
            full_name: 'Compradora Teste'
          },
          error: null
        });
      }
      if (table === 'email_logs') {
        return query({ data: { id: 'email-1', status: 'delivered' }, error: null });
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const response = await POST(new Request('https://zeroapp.tech/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'COMPRADORA@EXAMPLE.COM',
        full_name: 'Compradora Teste',
        user_id: '11111111-1111-4111-8111-111111111111'
      })
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sent: false, duplicate: true });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
