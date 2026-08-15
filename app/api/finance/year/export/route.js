import { NextResponse } from 'next/server';
import { loadAnnualSummaryRequest } from '@/src/modules/finance/application/annual-summary-request';
import { buildAnnualSummaryPdf, buildAnnualSummaryXlsx } from '@/src/modules/finance/application/annual-summary-export';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FORMATS = new Set(['xlsx', 'pdf']);

function safeFilenamePart(value) {
  return String(value || 'cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'cliente';
}

export async function GET(request) {
  const year = request.nextUrl.searchParams.get('year');
  const requestedUserId = request.nextUrl.searchParams.get('user_id');
  const format = String(request.nextUrl.searchParams.get('format') || '').toLowerCase();
  if (!FORMATS.has(format)) return NextResponse.json({ error: 'invalid_format' }, { status: 400 });

  try {
    const loaded = await loadAnnualSummaryRequest({ year, requestedUserId });
    if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

    const clientName = loaded.context.targetProfile?.full_name || loaded.context.targetProfile?.email || 'Cliente';
    const buffer = format === 'pdf'
      ? await buildAnnualSummaryPdf({ summary: loaded.summary, clientName })
      : buildAnnualSummaryXlsx({ summary: loaded.summary, clientName });
    const filename = `resumo-financeiro-${safeFilenamePart(clientName)}-${year}.${format}`;

    if (loaded.context.impersonating) {
      await recordAdminAudit({
        supabase: loaded.supabase,
        adminUserId: loaded.context.user.id,
        targetUserId: loaded.context.targetUserId,
        action: 'read',
        resource: 'financial_year_export',
        resourceId: year,
        metadata: { year, format }
      });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('[finance/year/export] failed:', error?.message || error);
    return NextResponse.json({ error: 'annual_export_failed' }, { status: 500 });
  }
}
