import { describe, expect, it } from 'vitest';
import { actionProgress, summarizePlan } from './patrimony.action-plan';

describe('plano de ação', () => {
  it('calcula progresso pelo saldo da dívida', () => {
    expect(actionProgress({ progress_source: 'debt_balance', baseline_amount: 6400, link_id: 'd1' }, { debtsById: { d1: { current_balance: 3150 } } }).pct).toBe(51);
  });
  it('calcula progresso pelos aportes do objetivo', () => {
    expect(actionProgress({ progress_source: 'goal_contributions', target_amount: 900, link_id: 'g1' }, { goalContributionsByGoalId: { g1: 600 } }).pct).toBe(67);
  });
  it('resume o plano', () => {
    expect(summarizePlan([{ status: 'cumprido' }, { status: 'aberto' }, { status: 'aberto' }, { status: 'em_andamento' }])).toEqual({ total: 4, done: 1, open: 3, pct: 25 });
    expect(summarizePlan([{ status: 'nao_cumprido' }, { status: 'aberto' }]).open).toBe(1);
  });
});
