import { describe, expect, it } from 'vitest';
import { formatBRL, formatCompactBRL, formatPercent, parseBRL, parsePercent } from './patrimony.money';

describe('patrimony money', () => {
  it('parses Brazilian money safely', () => {
    expect(parseBRL('R$ 8.420,00')).toBe(8420); expect(parseBRL('8.420')).toBe(8420);
    expect(parseBRL('8420,5')).toBe(8420.5); expect(parseBRL('-10')).toBeNull(); expect(parseBRL('abc')).toBeNull();
  });
  it('formats money and percentages', () => {
    expect(formatBRL(-6710)).toBe('-R$ 6.710,00'); expect(formatBRL(-6710, { cents: false })).toBe('-R$ 6.710');
    expect(formatCompactBRL(66000)).toBe('R$ 66,0k'); expect(formatCompactBRL(1250000)).toBe('R$ 1,25mi'); expect(formatCompactBRL(950)).toBe('R$ 950');
    expect(parsePercent('14,5%')).toBe(14.5); expect(formatPercent(18.65)).toBe('18,7%');
  });
});
