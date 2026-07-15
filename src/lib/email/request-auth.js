import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';

export function isCronAuthorized(request) {
  return isCronRequestAuthorized(request);
}

export async function authorizeCronOrAdmin(request) {
  if (isCronAuthorized(request)) {
    return {
      ok: true,
      auth: 'cron'
    };
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return {
      ok: false,
      status: 401,
      error: 'unauthorized'
    };
  }

  const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
  if (!isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'forbidden'
    };
  }

  return {
    ok: true,
    auth: 'admin',
    user,
    profile
  };
}
