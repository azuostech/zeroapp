/**
 * Publica um evento no feed coletivo da turma.
 * Nao lanca excecao: falha silenciosamente para nao bloquear o fluxo principal.
 */
import { getServiceSupabase } from '@/src/lib/supabase/service';

const LEGACY_ALLOWED_EVENT_TYPES = new Set([
  'month_complete',
  'goal_reached',
  'gain_grande',
  'gratitude_streak_7',
  'gratitude_streak_30',
  'identity_registered',
  'tier_upgrade',
  'workshop_redeemed'
]);

function resolveDisplayName(profile) {
  const fullName = String(profile?.full_name || '').trim();
  if (fullName) return fullName;

  const email = String(profile?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return 'Mentorado';

  const localPart = email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!localPart) return 'Mentorado';

  return localPart
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function isLegacyEventTypeAllowed(eventType) {
  return LEGACY_ALLOWED_EVENT_TYPES.has(String(eventType || '').trim());
}

function resolveLegacyEventType(eventType) {
  const normalized = String(eventType || '').trim();
  if (isLegacyEventTypeAllowed(normalized)) return normalized;

  if (normalized === 'gain_registered') return 'gain_grande';
  if (normalized === 'gratitude_registered') return 'gratitude_streak_7';

  return 'identity_registered';
}

function isEventTypeConstraintError(error) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  return code === '23514' && message.includes('event_type');
}

// CLAUDE-HANDOFF-MARKER: Community feed compatibility fallback for legacy event_type constraints (2026-05-30)
async function insertFeedPayload(writer, supabase, payload) {
  const { error: insertError } = await writer.from('feed_events').insert(payload);
  if (!insertError) return null;

  if (writer !== supabase) {
    const { error: fallbackInsertError } = await supabase.from('feed_events').insert(payload);
    return fallbackInsertError || null;
  }

  return insertError;
}

export async function publishFeedEvent(
  supabase,
  {
    userId,
    eventType,
    title,
    body = null,
    metadata = {},
    shareInFeed = true
  }
) {
  try {
    if (!shareInFeed) return;

    let writer = supabase;

    try {
      writer = getServiceSupabase();
    } catch (_) {
      writer = supabase;
    }

    const { data: profile, error: profileError } = await writer
      .from('profiles')
      .select('turma,full_name,email,tier')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) {
      throw profileError;
    }

    const authorName = resolveDisplayName(profile);
    const authorTier = String(profile?.tier || 'DESPERTAR').toUpperCase();
    const requestedEventType = String(eventType || '').trim();
    const baseMetadata = metadata && typeof metadata === 'object' ? metadata : {};

    const payload = {
      user_id: userId,
      event_type: requestedEventType,
      title,
      body,
      metadata: {
        ...baseMetadata,
        author_name: authorName,
        author_tier: authorTier
      },
      is_visible: true,
      turma: profile?.turma || null
    };

    const insertError = await insertFeedPayload(writer, supabase, payload);
    if (!insertError) return;

    if (isEventTypeConstraintError(insertError)) {
      const legacyEventType = resolveLegacyEventType(requestedEventType);
      const compatibilityPayload = {
        ...payload,
        event_type: legacyEventType,
        metadata: {
          ...payload.metadata,
          event_type_original: requestedEventType
        }
      };

      const compatibilityError = await insertFeedPayload(writer, supabase, compatibilityPayload);
      if (!compatibilityError) return;
      throw compatibilityError;
    }

    throw insertError;
  } catch (error) {
    console.error('[community/feed-publisher] publish failed:', {
      userId,
      eventType,
      reason: error?.message || 'unknown_error'
    });
  }
}
