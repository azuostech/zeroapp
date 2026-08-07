/**
 * Compatibilidade temporária com os fluxos que publicavam conquistas no feed.
 * A comunidade interna foi descontinuada; nenhuma nova atividade é persistida.
 */
export async function publishFeedEvent() {
  return { skipped: true, reason: 'community_discontinued' };
}
