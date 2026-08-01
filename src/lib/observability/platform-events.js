import 'server-only';
import { getServiceSupabase } from '@/src/lib/supabase/service';

const CATEGORIES = new Set(['user', 'auth', 'commerce', 'diagnostic', 'email', 'admin', 'system']);
const SEVERITIES = new Set(['info', 'success', 'warning', 'error']);

function text(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function metadata(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export async function recordPlatformEvent({
  eventType,
  category = 'system',
  severity = 'info',
  status = '',
  userId = null,
  actorId = null,
  source,
  title,
  message = '',
  metadata: eventMetadata = {}
}) {
  if (!eventType || !source || !title) return { success: false, error: 'invalid_platform_event' };

  try {
    const service = getServiceSupabase();
    const normalizedSeverity = SEVERITIES.has(severity) ? severity : 'info';
    const normalizedStatus = ['open', 'resolved'].includes(status)
      ? status
      : ['warning', 'error'].includes(normalizedSeverity) ? 'open' : 'resolved';
    const occurredAt = new Date().toISOString();
    const { error } = await service.from('platform_events').insert({
      event_type: text(eventType, 120),
      category: CATEGORIES.has(category) ? category : 'system',
      severity: normalizedSeverity,
      status: normalizedStatus,
      user_id: userId || null,
      actor_id: actorId || null,
      source: text(source, 160),
      title: text(title, 200),
      message: text(message, 1000) || null,
      metadata: metadata(eventMetadata),
      occurred_at: occurredAt,
      resolved_at: normalizedStatus === 'resolved' ? occurredAt : null
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[platform-events] failed:', error?.message || error);
    return { success: false, error: error?.message || 'platform_event_write_failed' };
  }
}
