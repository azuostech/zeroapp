import { describe, expect, it } from 'vitest';
import { contributionStreak, monthContributions, plannedFromFinance } from './investments.planned';

describe('planejamento de aportes', () => {
  it('soma Reserva de Liquidez e Investimentos', () => expect(plannedFromFinance({ 'pagar-primeiro': [{ nome: 'Reserva de Liquidez', valor_previsto: '500' }], investimentos: [{ nome: 'Carteira', valor_previsto: '400' }] })).toEqual({ reserve: 500, investments: 400, total: 900 }));
  it('calcula sequência mensal', () => expect(contributionStreak(['2026-08-10', '2026-09-10', '2026-10-10', '2026-11-01'], '2026-11-20')).toBe(4));
  it('soma aportes do mês', () => expect(monthContributions([{ kind: 'aporte', amount: 300, occurred_on: '2026-11-01' }, { kind: 'aporte', amount: 300, occurred_on: '2026-11-20' }, { kind: 'resgate', amount: 50, occurred_on: '2026-11-21' }], '2026-11')).toBe(600));
});
