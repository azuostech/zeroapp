import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { isAdminProfile } from '@/src/modules/admin/application/admin-impersonation-service';
import { buildPlatformActivity } from '@/src/modules/admin/application/platform-activity';

export const runtime = 'nodejs';

const ALLOWED_RANGES = new Set([1, 7, 30, 90]);
const QUERY_LIMIT = 300;

function rangeDays(value) {
  const parsed = Number(value);
  return ALLOWED_RANGES.has(parsed) ? parsed : 7;
}

function rows(result, label, { optional = false } = {}) {
  if (!result?.error) return result?.data || [];
  if (optional && result.error.code === '42P01') return [];
  throw new Error(`${label}:${result.error.message || result.error.code || 'query_failed'}`);
}

export async function GET(request) {
  const session = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(session);
  if (!user || !profile) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isAdminProfile(profile)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const days = rangeDays(request.nextUrl.searchParams.get('days'));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const service = getServiceSupabase();

  try {
    const [recentProfilesResult, accessResult, diagnosticsResult, emailsResult, feedResult, webhooksResult, platformResult, adminResult] =
      await Promise.all([
        service
          .from('profiles')
          .select('id,full_name,email,phone,tier,turma,status,role,created_at')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('product_access')
          .select('id,user_id,product_code,purchase_id,status,source,granted_at,revoked_at,created_at,updated_at')
          .gte('updated_at', cutoff)
          .order('updated_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('irc_diagnostics')
          .select('id,user_id,status,email_status,pdf_status,last_error,created_at,updated_at')
          .or(`updated_at.gte.${cutoff},status.in.(not_started,in_progress,generation_failed)`)
          .order('updated_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('email_logs')
          .select('id,user_id,email_type,recipient,subject,status,sent_at,created_at,last_event_at')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('feed_events')
          .select('id,user_id,event_type,title,created_at')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('commerce_webhook_events')
          .select('id,provider,event_type,product_code,purchase_id,status,attempts,last_error,created_at,updated_at')
          .gte('updated_at', cutoff)
          .order('updated_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('platform_events')
          .select('id,event_type,category,severity,status,user_id,actor_id,source,title,message,metadata,occurred_at,created_at')
          .gte('occurred_at', cutoff)
          .order('occurred_at', { ascending: false })
          .limit(QUERY_LIMIT),
        service
          .from('admin_action_logs')
          .select('id,admin_user_id,target_user_id,action,resource,resource_id,metadata,created_at')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(QUERY_LIMIT)
      ]);

    const recentProfiles = rows(recentProfilesResult, 'profiles');
    const productAccess = rows(accessResult, 'product_access');
    const diagnostics = rows(diagnosticsResult, 'irc_diagnostics');
    const emailLogs = rows(emailsResult, 'email_logs');
    const feedEvents = rows(feedResult, 'feed_events');
    const webhookEvents = rows(webhooksResult, 'commerce_webhook_events');
    const platformEvents = rows(platformResult, 'platform_events', { optional: true });
    const adminLogs = rows(adminResult, 'admin_action_logs');

    const userIds = new Set(recentProfiles.map((item) => item.id));
    productAccess.forEach((item) => userIds.add(item.user_id));
    diagnostics.forEach((item) => userIds.add(item.user_id));
    emailLogs.forEach((item) => userIds.add(item.user_id));
    feedEvents.forEach((item) => userIds.add(item.user_id));
    platformEvents.forEach((item) => {
      userIds.add(item.user_id);
      userIds.add(item.actor_id);
    });
    adminLogs.forEach((item) => {
      userIds.add(item.admin_user_id);
      userIds.add(item.target_user_id);
    });
    userIds.delete(null);
    userIds.delete(undefined);

    let profiles = recentProfiles;
    if (userIds.size) {
      const profileResult = await service
        .from('profiles')
        .select('id,full_name,email,phone,tier,turma,status,role,created_at')
        .in('id', Array.from(userIds));
      profiles = rows(profileResult, 'profile_lookup');
    }

    const profileById = new Map(profiles.map((item) => [item.id, item]));
    const recentProfileIds = new Set(recentProfiles.map((item) => item.id));
    const activity = buildPlatformActivity({
      profiles: recentProfiles,
      profileById,
      productAccess,
      diagnostics,
      emailLogs,
      feedEvents,
      webhookEvents,
      platformEvents,
      adminLogs
    });

    return NextResponse.json({
      ...activity,
      range_days: days,
      generated_at: new Date().toISOString(),
      setup_required: Boolean(platformResult?.error?.code === '42P01'),
      metrics: {
        ...activity.metrics,
        new_users: recentProfiles.filter((item) => item.role !== 'admin' && recentProfileIds.has(item.id)).length
      }
    });
  } catch (error) {
    console.error('[admin/activity] load failed:', error?.message || error);
    return NextResponse.json({ error: 'activity_load_failed' }, { status: 500 });
  }
}
