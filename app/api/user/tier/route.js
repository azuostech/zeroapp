import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { getTierInfo } from '@/src/modules/profile/domain/tier-config';

export async function GET(request) {
  const supabase = await createServerSupabase();
  const requestedUserId = request.nextUrl.searchParams.get('user_id');
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  const resolvedProfile = context.impersonating ? context.targetProfile : context.profile;

  if (!resolvedProfile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
  }

  if (!context.isAdmin && resolvedProfile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const tierInfo = getTierInfo(resolvedProfile.tier);
    return NextResponse.json({
      tier: tierInfo.tier,
      features: tierInfo.features,
      coins_monthly: tierInfo.coins_monthly,
      next_tier: tierInfo.next_tier
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'tier_lookup_failed' }, { status: 500 });
  }
}
