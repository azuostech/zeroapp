import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export async function POST(_request, { params }) {
  const supabase = await createServerSupabase();
  const { user } = await getCurrentProfile(supabase);

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const contentId = String(resolvedParams?.id || '').trim();

  if (!contentId) {
    return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });
  }

  console.log(`[content-access] user=${user.id} content=${contentId}`);
  return NextResponse.json({ success: true });
}
