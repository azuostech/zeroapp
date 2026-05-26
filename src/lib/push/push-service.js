import webpush from 'web-push';
import { getServiceSupabase } from '@/src/lib/supabase/service';

const PUSH_CONFIG = {
  subject: process.env.VAPID_SUBJECT || '',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

const isPushConfigured = Boolean(PUSH_CONFIG.subject && PUSH_CONFIG.publicKey && PUSH_CONFIG.privateKey);

if (isPushConfigured) {
  webpush.setVapidDetails(PUSH_CONFIG.subject, PUSH_CONFIG.publicKey, PUSH_CONFIG.privateKey);
} else {
  console.warn('[push-service] chaves VAPID nao configuradas; push sera ignorado');
}

export async function sendPushToUser(userId, { title, body, url = '/' }) {
  if (!userId) return { sent: 0, failed: 0, removed: 0, skipped: 'missing_user' };
  if (!isPushConfigured) return { sent: 0, failed: 0, removed: 0, skipped: 'not_configured' };

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (error) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: error?.message || 'service_client_unavailable'
    };
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    return { sent: 0, failed: 0, removed: 0, skipped: error.message || 'subscriptions_query_failed' };
  }

  if (!Array.isArray(subs) || subs.length === 0) {
    return { sent: 0, failed: 0, removed: 0, skipped: 'no_subscriptions' };
  }

  const payload = JSON.stringify({
    title: title || 'ZeroApp',
    body: body || '',
    url
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload
      );

      sent += 1;
    } catch (errorPush) {
      failed += 1;

      if (errorPush?.statusCode === 404 || errorPush?.statusCode === 410) {
        const { error: deleteError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', sub.endpoint);

        if (!deleteError) {
          removed += 1;
        }
      }
    }
  }

  return { sent, failed, removed };
}
