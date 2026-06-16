import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { createAdminContext, parseJsonBody, resolveShamarDbError } from '@/src/lib/shamar/api';

function writerClient(fallback) {
  try {
    return getServiceSupabase();
  } catch (_) {
    return fallback;
  }
}

export async function PATCH(request, { params }) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const userId = String(params?.id || '').trim();
  if (!userId) return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const shamarUnlocked = parsed.body?.shamar_unlocked;
  if (typeof shamarUnlocked !== 'boolean') {
    return NextResponse.json({ error: 'shamar_unlocked_invalido' }, { status: 422 });
  }

  const supabase = writerClient(context.supabase);
  const { data, error } = await supabase
    .from('profiles')
    .update({ shamar_unlocked: shamarUnlocked })
    .eq('id', userId)
    .select('id,email,full_name,status,tier,turma,shamar_unlocked')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_user_update_failed') }, { status: 500 });
  }

  await recordAdminAudit({
    supabase: context.supabase,
    adminUserId: context.user.id,
    targetUserId: userId,
    action: shamarUnlocked ? 'unlock' : 'lock',
    resource: 'shamar_access',
    resourceId: userId,
    metadata: { shamar_unlocked: shamarUnlocked }
  });

  return NextResponse.json({ user: data });
}
