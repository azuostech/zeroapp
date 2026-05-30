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

    const payload = {
      user_id: userId,
      event_type: eventType,
      title,
      body,
      metadata: {
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
        author_name: authorName,
        author_tier: authorTier
      },
      is_visible: true,
      turma: profile?.turma || null
    };

    const { error: insertError } = await writer.from('feed_events').insert(payload);
    if (insertError && writer !== supabase) {
      const { error: fallbackInsertError } = await supabase.from('feed_events').insert(payload);
      if (fallbackInsertError) {
        throw fallbackInsertError;
      }
      return;
    }

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error('[community/feed-publisher] publish failed:', {
      userId,
      eventType,
      reason: error?.message || 'unknown_error'
    });
  }
}
