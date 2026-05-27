import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { listUsers } from '@/src/modules/admin/application/admin-service';
import { isAdminProfile } from '@/src/modules/admin/application/admin-impersonation-service';

export async function GET() {
  const supabase = await createServerSupabase();
  const { profile } = await getCurrentProfile(supabase);

  if (!profile || !isAdminProfile(profile)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const users = await listUsers(supabase);
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
