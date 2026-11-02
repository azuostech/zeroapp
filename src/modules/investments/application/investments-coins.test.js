import { describe, expect, it, vi } from 'vitest';
vi.mock('../../../lib/supabase/service', () => ({ getServiceSupabase: vi.fn() }));
import { awardInvestmentClaims } from './investments-coins';

function claimQuery(result) {
  return { upsert: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn(async () => result) })) })) };
}

describe('awardInvestmentClaims', () => {
  it('premia o aluno alvo e devolve o saldo da RPC', async () => {
    const service = { from: vi.fn(() => claimQuery({ data: { claim_key: 'first' }, error: null })), rpc: vi.fn(async () => ({ data: [{ new_coins: 100, new_total: 250, new_phase: 'SOBREVIVENTE' }], error: null })) };
    const result = await awardInvestmentClaims({ userId: 'student-1', claims: [{ key: 'first', action: 'investment_first', amount: 100 }], service });
    expect(service.rpc).toHaveBeenCalledWith('award_coins', expect.objectContaining({ p_user_id: 'student-1', p_amount: 100, p_action_type: 'investment_first' }));
    expect(result).toEqual({ awarded: [{ key: 'first', action: 'investment_first', amount: 100 }], balance: { coins: 100, coins_total: 250, phase: 'SOBREVIVENTE' } });
  });

  it('não chama a RPC quando o claim já existe', async () => {
    const service = { from: vi.fn(() => claimQuery({ data: null, error: null })), rpc: vi.fn() };
    expect(await awardInvestmentClaims({ userId: 'student-1', claims: [{ key: 'month:2026-11', action: 'investment_month', amount: 20 }], service })).toEqual({ awarded: [], balance: null });
    expect(service.rpc).not.toHaveBeenCalled();
  });
});
