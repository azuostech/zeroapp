import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  pdf: vi.fn(),
  xlsx: vi.fn(),
  template: vi.fn(),
  send: vi.fn(),
  audit: vi.fn()
}));

vi.mock('@/src/modules/finance/application/annual-summary-request', () => ({ loadAnnualSummaryRequest: mocks.load }));
vi.mock('@/src/modules/finance/application/annual-summary-export', () => ({ buildAnnualSummaryPdf: mocks.pdf, buildAnnualSummaryXlsx: mocks.xlsx }));
vi.mock('@/src/lib/email/templates/annual-financial-summary', () => ({ annualFinancialSummaryTemplate: mocks.template }));
vi.mock('@/src/lib/email/email-service', () => ({ sendEmail: mocks.send }));
vi.mock('@/src/modules/admin/application/admin-audit-service', () => ({ recordAdminAudit: mocks.audit }));

import { POST } from './route';

function request(body) {
  return new Request('https://zeroapp.tech/api/finance/year/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('annual finance email route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends only to the registered client email with PDF and Excel attachments', async () => {
    const summary = {
      year: '2026',
      totals: { revenue: 100, expenses: 40, balance: 60 },
      blocks: [{ key: 'receitas', total: 100, revenuePercentage: 100 }]
    };
    mocks.load.mockResolvedValue({
      ok: true,
      summary,
      supabase: {},
      context: {
        impersonating: true,
        user: { id: 'admin' },
        targetUserId: 'client',
        targetProfile: { full_name: 'Cliente Teste', email: 'cliente@example.com' }
      }
    });
    mocks.pdf.mockResolvedValue(Buffer.from('pdf'));
    mocks.xlsx.mockReturnValue(Buffer.from('xlsx'));
    mocks.template.mockReturnValue({ subject: 'Resumo', html: '<p>Resumo</p>' });
    mocks.send.mockResolvedValue({ success: true, id: 'email-1' });

    const response = await POST(request({ year: '2026', user_id: 'client', recipient: 'attacker@example.com' }));

    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'cliente@example.com',
      attachments: [
        expect.objectContaining({ filename: 'resumo-financeiro-2026.pdf' }),
        expect.objectContaining({ filename: 'resumo-financeiro-2026.xlsx' })
      ]
    }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ resource: 'financial_year_email', targetUserId: 'client' }));
  });

  it('does not call the email provider when the registered email is missing', async () => {
    mocks.load.mockResolvedValue({
      ok: true,
      summary: { year: '2026' },
      context: { impersonating: true, targetProfile: {}, user: { email: 'admin@example.com' }, targetUserId: 'client' }
    });

    const response = await POST(request({ year: '2026', user_id: 'client' }));
    expect(response.status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
