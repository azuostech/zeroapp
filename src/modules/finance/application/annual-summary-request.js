import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { loadAnnualFinancialSummary } from './annual-summary-service';

export function isValidAnnualSummaryYear(year) {
  return typeof year === 'string' && /^\d{4}$/.test(year);
}

export async function loadAnnualSummaryRequest({ year, requestedUserId }) {
  if (!isValidAnnualSummaryYear(year)) {
    return { ok: false, status: 400, error: 'invalid_year' };
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({ supabase, requestedUserId });
  if (!context.ok) return context;
  if (!context.isAdmin && context.profile.status !== 'active') {
    return { ok: false, status: 403, error: 'inactive_account' };
  }

  const summary = await loadAnnualFinancialSummary({ supabase, userId: context.targetUserId, year });
  return { ok: true, supabase, context, summary };
}
