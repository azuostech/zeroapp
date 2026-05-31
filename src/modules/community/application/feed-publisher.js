/**
 * Publica um evento no feed coletivo da turma.
 * Nao lanca excecao: falha silenciosamente para nao bloquear o fluxo principal.
 */
import { getServiceSupabase } from '@/src/lib/supabase/service';

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

async function insertFeedPayload(writer, supabase, payload) {
  const { error: insertError } = await writer.from('feed_events').insert(payload);
  if (!insertError) return null;

  if (writer !== supabase) {
    const { error: fallbackInsertError } = await supabase.from('feed_events').insert(payload);
    return fallbackInsertError || null;
  }

  return insertError;
}

async function loadAuthorProfileSnapshot(writer, supabase, userId) {
  const selectFields = 'turma,full_name,email,tier';
  const tryRead = async (client) =>
    client.from('profiles').select(selectFields).eq('id', userId).maybeSingle();

  const primary = await tryRead(writer);
  if (primary.data) {
    return primary.data;
  }

  if (writer !== supabase) {
    const fallback = await tryRead(supabase);
    if (fallback.data) {
      return fallback.data;
    }

    if (primary.error && fallback.error) {
      throw fallback.error;
    }
  }

  if (primary.error) {
    throw primary.error;
  }

  return null;
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

    const profile = await loadAuthorProfileSnapshot(writer, supabase, userId);

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
        event_type_original: requestedEventType,
        author_name: authorName,
        author_tier: authorTier
      },
      is_visible: true,
      turma: profile?.turma || null
    };

    const insertError = await insertFeedPayload(writer, supabase, payload);
    if (insertError) throw insertError;
  } catch (error) {
    console.error('[community/feed-publisher] publish failed:', {
      userId,
      eventType,
      reason: error?.message || 'unknown_error'
    });
  }
}
