import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export const runtime = 'nodejs';

function parseLimit(raw) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) return 50;
  return parsed;
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const isAdmin = Boolean(profile?.role === 'admin' || profile?.is_admin);
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

  const { data, error } = await supabase
    .from('email_logs')
    .select('id, user_id, email_type, recipient, subject, resend_id, status, sent_at')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message || 'email_logs_query_failed' }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}
