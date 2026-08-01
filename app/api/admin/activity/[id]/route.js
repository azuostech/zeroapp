import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { isAdminProfile } from '@/src/modules/admin/application/admin-impersonation-service';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const session = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(session);
  if (!user || !profile) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isAdminProfile(profile)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status === 'resolved' ? 'resolved' : body?.status === 'open' ? 'open' : '';
  if (!status) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });

  const service = getServiceSupabase();
  const payload = status === 'resolved'
    ? {
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_note: String(body?.resolution_note || '').trim().slice(0, 500) || null
      }
    : { status, resolved_at: null, resolved_by: null, resolution_note: null };

  const { data, error } = await service
    .from('platform_events')
    .update(payload)
    .eq('id', id)
    .select('id,status,resolved_at')
    .maybeSingle();

  if (error) {
    console.error('[admin/activity] update failed:', error.message || error);
    return NextResponse.json({ error: 'activity_update_failed' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'activity_not_found' }, { status: 404 });
  return NextResponse.json({ event: data });
}
