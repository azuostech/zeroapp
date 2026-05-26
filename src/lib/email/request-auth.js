import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

const CRON_SECRET = process.env.CRON_SECRET || '';

export function isCronAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  return Boolean(CRON_SECRET) && authHeader === `Bearer ${CRON_SECRET}`;
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

  const isAdmin = Boolean(profile?.role === 'admin' || profile?.is_admin);
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
