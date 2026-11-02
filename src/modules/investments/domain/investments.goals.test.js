import { describe, expect, it } from 'vitest';
import { DAILY_BANK, GOALS, POSITIONS, TODAY } from './investments.fixtures';
import { goalProgress, goalTotals, reserveChecklist, reserveStatus } from './investments.goals';

describe('objetivos de investimentos', () => {
  it('agrupa os totais das fixtures', () => expect(goalTotals({ goals: GOALS, positions: POSITIONS }).map((item) => item.total)).toEqual([5750, 2100, 8582]));
  it('resume a reserva', () => expect(reserveStatus({ reserveTotal: 5750, costOfLiving: 6000, targetMonths: 6, plannedMonthly: 900 })).toMatchObject({ label: '1 de 6 meses', pct: 16, missing: 30250, monthsToGoal: 34, monthsToGoalLabel: '2 anos e 10 meses' }));
  it('avalia o checklist', () => expect(reserveChecklist({ positions: POSITIONS.filter((item) => item.goal_id === 'g-res'), dailyBank: DAILY_BANK, today: TODAY }).map((item) => item.ok)).toEqual([true, true, true, false]));
  it('calcula a viagem', () => expect(goalProgress(GOALS[1], 2100, TODAY)).toMatchObject({ pct: 26, monthsLeft: 13, missing: 5900 }));
});
