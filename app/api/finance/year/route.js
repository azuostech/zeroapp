import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { loadAnnualFinancialSummary } from '@/src/modules/finance/application/annual-summary-service';

function validYear(year) {
  return typeof year === 'string' && /^\d{4}$/.test(year);
}

export async function GET(request) {
  const year = request.nextUrl.searchParams.get('year');
  const requestedUserId = request.nextUrl.searchParams.get('user_id');

  if (!validYear(year)) {
    return NextResponse.json({ error: 'invalid_year' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({ supabase, requestedUserId });

  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const summary = await loadAnnualFinancialSummary({
      supabase,
      userId: context.targetUserId,
      year
    });

    if (context.impersonating) {
      await recordAdminAudit({
        supabase,
        adminUserId: context.user.id,
        targetUserId: context.targetUserId,
        action: 'read',
        resource: 'financial_year_summary',
        resourceId: year,
        metadata: { year }
      });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
