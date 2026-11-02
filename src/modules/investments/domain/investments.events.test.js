import { expect, it } from 'vitest';
import { buildCalendar } from './investments.events';

it('agrupa vencimentos, carências e objetivos por mês', () => {
  const result = buildCalendar({ today: '2026-11-01', positions: [{ id: 'p1', name: 'CDB', status: 'ativa', redeemable_from: '2026-11-20', maturity_date: '2027-03-10' }], goals: [{ id: 'g1', name: 'Viagem', target_date: '2027-01-01' }] });
  expect(result.thisMonthCount).toBe(1);
  expect(result.months.map((item) => item.month)).toEqual(['2026-11', '2027-01', '2027-03']);
});
