import { describe, expect, it } from 'vitest';
import { annualFinancialSummaryTemplate } from './annual-financial-summary';

describe('annual financial summary email', () => {
  it('escapes client and block names and identifies both attachments', () => {
    const template = annualFinancialSummaryTemplate({
      clientName: '<Cliente>',
      summary: {
        year: '2026',
        totals: { revenue: 1000, expenses: 400, balance: 600 },
        blocks: [{ label: '<Receitas>', total: 1000, revenuePercentage: 100 }]
      }
    });

    expect(template.subject).toContain('2026');
    expect(template.html).toContain('&lt;Cliente&gt;');
    expect(template.html).toContain('&lt;Receitas&gt;');
    expect(template.html).toContain('PDF e a planilha Excel');
    expect(template.html).not.toContain('<Cliente>');
  });
});
