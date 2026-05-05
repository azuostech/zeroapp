import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { updateUserTier } from '@/src/modules/admin/application/admin-service';

export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const tier = String(body?.tier || '').toUpperCase();

  if (!tier) {
    return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    await updateUserTier({
      supabase,
      targetUserId: id,
      tier
    });
    return NextResponse.json({ ok: true, tier });
  } catch (error) {
    if (error.message === 'invalid_tier') {
      return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
