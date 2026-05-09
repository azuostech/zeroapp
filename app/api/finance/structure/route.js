import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { validateMonthYear } from '@/src/modules/finance/application/finance-service';
import {
  parseStructureOperation,
  replicateStructureOperation
} from '@/src/modules/finance/application/structure-sync-service';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

export async function POST(request) {
  const body = await request.json();
  const currentMonth = body?.month;
  const currentYear = body?.year;
  const operation = body?.operation;
  const requestedUserId = body?.user_id;

  if (!validateMonthYear(currentMonth, currentYear)) {
    return NextResponse.json({ error: 'invalid_month_or_year' }, { status: 400 });
  }

  const parsed = parseStructureOperation(operation);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const result = await replicateStructureOperation({
      supabase,
      userId: context.targetUserId,
      currentMonth,
      currentYear,
      operation: parsed.value
    });

    if (context.impersonating) {
      await recordAdminAudit({
        supabase,
        adminUserId: context.user.id,
        targetUserId: context.targetUserId,
        action: 'update',
        resource: 'financial_structure',
        resourceId: `${currentYear}-${currentMonth}`,
        metadata: {
          month: currentMonth,
          year: currentYear,
          operation: parsed.value,
          affectedMonths: result.affectedMonths
        }
      });
    }

    return NextResponse.json({
      ok: true,
      affectedMonths: result.affectedMonths
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
