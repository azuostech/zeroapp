import { describe, expect, it } from 'vitest';
import { addMonths, businessDaysBetween, easterDate, firstDayOfMonth, nationalHolidays } from './investments.calendar';

describe('calendário de investimentos', () => {
  it('calcula a Páscoa e os feriados móveis de 2026', () => {
    expect(easterDate(2026)).toBe('2026-04-05');
    for (const day of ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-11-20']) {
      expect(nationalHolidays(2026).has(day)).toBe(true);
    }
  });

  it('conta dias úteis em intervalo aberto-fechado', () => {
    expect(businessDaysBetween('2026-01-01', '2026-01-31')).toBe(21);
    expect(businessDaysBetween('2026-01-01', '2026-03-01')).toBe(39);
  });

  it('opera meses sem depender do fuso local', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(firstDayOfMonth('2026-11-28')).toBe('2026-11-01');
  });
});
