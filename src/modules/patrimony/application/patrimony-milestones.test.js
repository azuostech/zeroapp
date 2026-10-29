import { describe, expect, it, vi } from 'vitest';
import { buildSnapshot, safeMilestoneNotification } from './patrimony-milestone-helpers';

describe('patrimony milestones', () => {
  it('keeps only business fields and active debts in snapshots', () => {
    const snapshot = buildSnapshot({
      settings: { monthly_income: 10000, monthly_cost_of_living: 5000, reserve_target_months: 6 },
      assets: [{ id: 'asset', category: 'reserva', name: 'CDB', current_value: 1000, updated_at: 'ignored' }],
      debts: [
        { id: 'active', debt_type: 'cartao', creditor: 'Banco', current_balance: 500, status: 'ativa', updated_at: 'ignored' },
        { id: 'paid', debt_type: 'cartao', creditor: 'Banco', current_balance: 0, status: 'quitada' }
      ]
    });
    expect(snapshot.assets[0]).not.toHaveProperty('updated_at');
    expect(snapshot.debts).toHaveLength(1);
    expect(snapshot.debts[0].id).toBe('active');
  });

  it('does not fail milestone creation when push fails', async () => {
    const sender = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await safeMilestoneNotification({ userId: 'user', label: 'Sessão 2', sender });
    expect(result).toMatchObject({ sent: 0, failed: 1, skipped: 'offline' });
  });
});
