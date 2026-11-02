import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY_RULES } from './investments.constants';
import { GOALS, POSITIONS } from './investments.fixtures';
import { checkNewPosition, evaluatePolicy, summarizePolicy } from './investments.policy';

describe('política de investimento', () => {
  it('avalia as fixtures', () => {
    const results = evaluatePolicy({ rules: DEFAULT_POLICY_RULES, positions: POSITIONS, goals: GOALS, costOfLiving: 6000 });
    expect(results.map((item) => [item.type, item.status])).toEqual([
      ['reserve_months_target', 'construcao'], ['variable_income_after_reserve', 'fora'], ['max_variable_income_pct', 'ok'], ['reserve_daily_liquidity_low_risk', 'ok'], ['max_per_institution_fgc', 'ok']
    ]);
    expect(results[0].progressPct).toBe(16);
    expect(results[2].detail).toBe('Hoje: 7,0%');
    expect(results[4].detail).toContain('Nubank');
    expect(summarizePolicy(results)).toEqual({ ok: 3, construcao: 1, fora: 1 });
  });
  it('avisa sobre carência na reserva', () => {
    const draft = { goal_id: 'g-res', asset_class: 'renda_fixa_bancaria', name: 'LCI Inter', redeemable_from: '2027-01-30', liquidity_days: 90, guarantee: 'fgc', first_contribution: { amount: 1000 } };
    const warnings = checkNewPosition({ draft, rules: DEFAULT_POLICY_RULES, positions: POSITIONS, goals: GOALS, costOfLiving: 6000 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('reserve_liquidity');
  });
});
