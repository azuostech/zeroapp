import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { updateUserStatus } from '@/src/modules/admin/application/admin-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';

const ALLOWED_STATUS = new Set(['active', 'disabled', 'pending']);

export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const status = body?.status;

  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    await updateUserStatus({
      supabase,
      actingUserId: user.id,
      targetUserId: id,
      status
    });
    await recordAdminAudit({
      supabase,
      adminUserId: user.id,
      targetUserId: id,
      action: 'update',
      resource: 'user_status',
      resourceId: id,
      metadata: { status }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
