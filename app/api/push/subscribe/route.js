import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export const runtime = 'nodejs';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const endpoint = String(body?.endpoint || '').trim();
  const p256dh = String(body?.keys?.p256dh || '').trim();
  const auth = String(body?.keys?.auth || '').trim();

  if (!isNonEmptyString(endpoint) || !isNonEmptyString(p256dh) || !isNonEmptyString(auth)) {
    return NextResponse.json({ error: 'invalid_subscription_payload' }, { status: 400 });
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth
    },
    {
      onConflict: 'user_id,endpoint'
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message || 'push_subscription_upsert_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
