import { describe, expect, it } from 'vitest';
import { HOJE } from '../../patrimony/domain/patrimony.fixtures';
import { DEFAULT_POLICY_RULES } from './investments.constants';
import { GOALS, POSITIONS, TODAY } from './investments.fixtures';
import { evaluatePolicy } from './investments.policy';
import { buildAlerts } from './investments.alerts';

it('ordena os alertas principais', () => {
  const policyResults = evaluatePolicy({ rules: DEFAULT_POLICY_RULES, positions: POSITIONS, goals: GOALS, costOfLiving: 6000 });
  expect(buildAlerts({ policyResults, positions: POSITIONS, goals: GOALS, debts: HOJE.debts, today: TODAY }).slice(0, 3).map((item) => item.type)).toEqual(['policy', 'expensive_debt', 'goal_maturity']);
});
