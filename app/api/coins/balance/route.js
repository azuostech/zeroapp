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
    let balance = null;
    let phase = null;

    // Preferimos a view consolidada quando existir.
    const { data: viewData, error: viewError } = await supabase
      .from('user_gamification')
      .select('coins, coins_total, phase')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!viewError && viewData) {
      balance = {
        coins: Number(viewData.coins || 0),
        coins_total: Number(viewData.coins_total || 0)
      };
      phase = calculatePhase(balance.coins_total);
    } else {
      balance = await getCoinsBalance({ supabase, userId: user.id });
      phase = calculatePhase(balance.coins_total);
    }

    return NextResponse.json({
      coins: balance.coins,
      coins_total: balance.coins_total,
      phase: phase.phase,
      data: {
        ...balance,
        phase,
        phase_label: phase.phase
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
