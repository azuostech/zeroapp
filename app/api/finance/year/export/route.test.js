import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  pdf: vi.fn(),
  xlsx: vi.fn(),
  audit: vi.fn()
}));

vi.mock('@/src/modules/finance/application/annual-summary-request', () => ({ loadAnnualSummaryRequest: mocks.load }));
vi.mock('@/src/modules/finance/application/annual-summary-export', () => ({ buildAnnualSummaryPdf: mocks.pdf, buildAnnualSummaryXlsx: mocks.xlsx }));
vi.mock('@/src/modules/admin/application/admin-audit-service', () => ({ recordAdminAudit: mocks.audit }));

import { GET } from './route';

describe('annual finance export route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unsupported formats before loading financial data', async () => {
    const response = await GET({ nextUrl: new URL('https://zeroapp.tech/api/finance/year/export?year=2026&format=csv') });
    expect(response.status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('returns a private Excel attachment and audits impersonated access', async () => {
    const summary = { year: '2026' };
    const supabase = {};
    mocks.load.mockResolvedValue({
      ok: true,
      summary,
      supabase,
      context: { impersonating: true, user: { id: 'admin' }, targetUserId: 'client', targetProfile: { full_name: 'Cliente Teste' } }
    });
    mocks.xlsx.mockReturnValue(Buffer.from('xlsx'));

    const response = await GET({ nextUrl: new URL('https://zeroapp.tech/api/finance/year/export?year=2026&format=xlsx&user_id=client') });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('spreadsheetml');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toContain('cliente-teste-2026.xlsx');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ targetUserId: 'client', resource: 'financial_year_export' }));
  });
});
