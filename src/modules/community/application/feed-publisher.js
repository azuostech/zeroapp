/**
 * Publica um evento no feed coletivo da turma.
 * Nao lanca excecao: falha silenciosamente para nao bloquear o fluxo principal.
 */
import { getServiceSupabase } from '@/src/lib/supabase/service';

export async function publishFeedEvent(
  supabase,
  {
    userId,
    eventType,
    title,
    body = null,
    metadata = {}
  }
) {
  try {
    let writer = supabase;

    try {
      writer = getServiceSupabase();
    } catch (_) {
      writer = supabase;
    }

    const { data: profile, error: profileError } = await writer.from('profiles').select('turma').eq('id', userId).maybeSingle();
    if (profileError) {
      throw profileError;
    }

    const payload = {
      user_id: userId,
      event_type: eventType,
      title,
      body,
      metadata,
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
