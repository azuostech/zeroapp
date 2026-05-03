import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { triggerPasswordReset } from '@/src/modules/admin/application/admin-service';

export async function POST(request) {
  const body = await request.json();
  const email = body?.email;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { profile } = await getCurrentProfile(supabase);

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    await triggerPasswordReset({
      supabase,
      email,
      redirectTo: `${new URL(request.url).origin}/auth/reset-password`
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
