import { NextResponse } from 'next/server';
import { loadAnnualSummaryRequest } from '@/src/modules/finance/application/annual-summary-request';
import { buildAnnualSummaryPdf, buildAnnualSummaryXlsx } from '@/src/modules/finance/application/annual-summary-export';
import { annualFinancialSummaryTemplate } from '@/src/lib/email/templates/annual-financial-summary';
import { sendEmail } from '@/src/lib/email/email-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const year = typeof body?.year === 'number' ? String(body.year) : body?.year;
  const requestedUserId = body?.user_id;

  try {
    const loaded = await loadAnnualSummaryRequest({ year, requestedUserId });
    if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

    const recipient = String(
      loaded.context.targetProfile?.email || (loaded.context.impersonating ? '' : loaded.context.user?.email) || ''
    ).trim();
    if (!recipient) return NextResponse.json({ error: 'recipient_email_missing' }, { status: 409 });

    const clientName = loaded.context.targetProfile?.full_name || recipient;
    const [pdf, xlsx] = await Promise.all([
      buildAnnualSummaryPdf({ summary: loaded.summary, clientName }),
      Promise.resolve(buildAnnualSummaryXlsx({ summary: loaded.summary, clientName }))
    ]);
    const template = annualFinancialSummaryTemplate({ summary: loaded.summary, clientName });
    const sent = await sendEmail({
      userId: loaded.context.targetUserId,
      to: recipient,
      subject: template.subject,
      html: template.html,
      emailType: 'annual_financial_summary',
      emailSnapshot: {
        year,
        revenue: loaded.summary.totals.revenue,
        expenses: loaded.summary.totals.expenses,
        balance: loaded.summary.totals.balance,
        blocks: loaded.summary.blocks.map((block) => ({ key: block.key, total: block.total, revenue_percentage: block.revenuePercentage }))
      },
      attachments: [
        { filename: `resumo-financeiro-${year}.pdf`, content: pdf },
        { filename: `resumo-financeiro-${year}.xlsx`, content: xlsx }
      ]
    });

    if (!sent.success) {
      return NextResponse.json({ error: sent.error || 'annual_email_failed' }, { status: 502 });
    }

    if (loaded.context.impersonating) {
      await recordAdminAudit({
        supabase: loaded.supabase,
        adminUserId: loaded.context.user.id,
        targetUserId: loaded.context.targetUserId,
        action: 'read',
        resource: 'financial_year_email',
        resourceId: year,
        metadata: { year, recipient }
      });
    }

    return NextResponse.json({ ok: true, recipient });
  } catch (error) {
    console.error('[finance/year/email] failed:', error?.message || error);
    return NextResponse.json({ error: 'annual_email_failed' }, { status: 500 });
  }
}
