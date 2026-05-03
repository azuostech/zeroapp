import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { awardCoins, validateCoinsAward } from '@/src/modules/coins/application/coins-service';

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json(
      {
        error: 'invalid_json',
        details: 'body deve ser um JSON válido'
      },
      { status: 400 }
    );
  }

  const { amount, action_type, description } = body || {};

  if (!validateCoinsAward(amount, action_type)) {
    return NextResponse.json(
      {
        error: 'invalid_coins_award',
        details: 'amount deve ser número != 0 e action_type deve ser válido'
      },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const result = await awardCoins({
      supabase,
      userId: user.id,
      amount,
      action_type,
      description
    });

    return NextResponse.json({
      data: result,
      message: `${amount > 0 ? '+' : ''}${amount} ZeroCoins`
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
