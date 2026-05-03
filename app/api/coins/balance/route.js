import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { calculatePhase, getCoinsBalance } from '@/src/modules/coins/application/coins-service';

export async function GET() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const balance = await getCoinsBalance({ supabase, userId: user.id });
    const phase = calculatePhase(balance.coins_total);

    return NextResponse.json({
      data: {
        ...balance,
        phase
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
