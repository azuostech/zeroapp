import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

function normalizeUserId(input) {
  if (input === undefined || input === null) return null;
  const value = String(input).trim();
  return value || null;
}

export function isAdminProfile(profile) {
  return Boolean(profile?.role === 'admin' || profile?.is_admin);
}

export async function resolveImpersonationContext({ supabase, requestedUserId }) {
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return {
      ok: false,
      status: 401,
      error: 'unauthorized'
    };
  }

  const isAdmin = isAdminProfile(profile);
  const normalizedRequestedUserId = normalizeUserId(requestedUserId);
  const sameAsActor = normalizedRequestedUserId === null || normalizedRequestedUserId === user.id;

  let targetProfile = profile;
  let targetUserId = user.id;

  if (!sameAsActor) {
    if (!isAdmin) {
      return {
        ok: false,
        status: 403,
        error: 'forbidden'
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,status,role,tier,is_admin,created_at,approved_at,approved_by')
      .eq('id', normalizedRequestedUserId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        status: 500,
        error: error.message || 'target_user_lookup_failed'
      };
    }

    if (!data) {
      return {
        ok: false,
        status: 404,
        error: 'target_user_not_found'
      };
    }

    targetProfile = data;
    targetUserId = data.id;
  }

  return {
    ok: true,
    user,
    profile,
    isAdmin,
    targetUserId,
    targetProfile,
    impersonating: targetUserId !== user.id
  };
}
