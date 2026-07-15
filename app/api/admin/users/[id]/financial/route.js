import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { getUserFinancialHistory } from '@/src/modules/admin/application/admin-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { getServiceSupabase } from '@/src/lib/supabase/service';

export async function GET(_request, { params }) {
  const { id } = params;
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile || (profile.role !== 'admin' && profile.is_admin !== true)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const serviceSupabase = getServiceSupabase();
    const data = await getUserFinancialHistory({ supabase: serviceSupabase, userId: id });
    await recordAdminAudit({
      supabase: serviceSupabase,
      adminUserId: user.id,
      targetUserId: id,
      action: 'read',
      resource: 'financial_data',
      metadata: { source: 'admin_user_financial_history' }
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
