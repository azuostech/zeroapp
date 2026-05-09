import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { loadFinancialMonth, saveFinancialMonth, validateMonthYear } from '@/src/modules/finance/application/finance-service';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

export async function GET(request) {
  const month = request.nextUrl.searchParams.get('month');
  const year = request.nextUrl.searchParams.get('year');
  const requestedUserId = request.nextUrl.searchParams.get('user_id');

  if (!validateMonthYear(month, year)) {
    return NextResponse.json({ error: 'invalid_month_or_year' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const data = await loadFinancialMonth({
      supabase,
      userId: context.targetUserId,
      month,
      year
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { month, year, data, user_id: requestedUserId } = body || {};

  if (!validateMonthYear(month, year)) {
    return NextResponse.json({ error: 'invalid_month_or_year' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    await saveFinancialMonth({
      supabase,
      userId: context.targetUserId,
      month,
      year,
      data
    });

    if (context.impersonating) {
      await recordAdminAudit({
        supabase,
        adminUserId: context.user.id,
        targetUserId: context.targetUserId,
        action: 'update',
        resource: 'financial_month',
        resourceId: `${year}-${month}`,
        metadata: { month, year }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
