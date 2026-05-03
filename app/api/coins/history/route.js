import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { getCoinsHistory } from '@/src/modules/coins/application/coins-service';

export async function GET(request) {
  const limitParam = request.nextUrl.searchParams.get('limit') || '20';
  const limit = Number.parseInt(limitParam, 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      {
        error: 'invalid_limit',
        details: 'limit deve ser entre 1 e 100'
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
    const history = await getCoinsHistory({
      supabase,
      userId: user.id,
      limit
    });

    return NextResponse.json({ data: history });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
