import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';

export async function GET(request) {
  const supabase = await createServerSupabase();
  const requestedUserId = request.nextUrl.searchParams.get('user_id');
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { user, profile, targetUserId, targetProfile, impersonating } = context;
  const resolvedProfile = impersonating ? targetProfile : profile;

  return NextResponse.json({
    user: {
      id: targetUserId,
      email: resolvedProfile?.email || user.email
    },
    profile: resolvedProfile,
    acting_user: { id: user.id, email: user.email },
    acting_profile: profile,
    impersonation: {
      active: impersonating,
      target_user_id: targetUserId
    }
  });
}
