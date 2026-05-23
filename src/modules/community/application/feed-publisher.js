/**
 * Publica um evento no feed coletivo da turma.
 * Nao lanca excecao: falha silenciosamente para nao bloquear o fluxo principal.
 */
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
    await supabase.from('feed_events').insert({
      user_id: userId,
      event_type: eventType,
      title,
      body,
      metadata,
      is_visible: true
    });
  } catch (_) {
    // Falha silenciosa: feed nao pode quebrar a acao principal.
  }
}
