'use client';

import { useCallback, useEffect, useState } from 'react';

async function parsePayload(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { raw };
  }
}

function resolveError(response, payload, fallback) {
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (typeof payload?.raw === 'string' && payload.raw.trim()) return payload.raw.trim();
  return `${fallback} (${response.status})`;
}

export function useComments(aulaId) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(async () => {
    if (!aulaId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/content/${aulaId}/comments`, { cache: 'no-store' });
      const payload = await parsePayload(response);
      if (!response.ok) throw new Error(resolveError(response, payload, 'Erro ao carregar comentários'));
      setComments(Array.isArray(payload?.comments) ? payload.comments : []);
      setTotal(Number(payload?.total || 0));
    } catch (err) {
      setComments([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : 'Erro ao carregar comentários');
    } finally {
      setIsLoading(false);
    }
  }, [aulaId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (body) => {
      const response = await fetch(`/api/content/${aulaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const payload = await parsePayload(response);
      if (!response.ok) throw new Error(resolveError(response, payload, 'Erro ao comentar'));
      await fetchComments();
    },
    [aulaId, fetchComments]
  );

  const addReply = useCallback(
    async (commentId, body) => {
      const response = await fetch(`/api/content/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      const payload = await parsePayload(response);
      if (!response.ok) throw new Error(resolveError(response, payload, 'Erro ao responder'));
      await fetchComments();
    },
    [fetchComments]
  );

  const deleteComment = useCallback(async (commentId) => {
    const response = await fetch(`/api/content/comments/${commentId}`, { method: 'DELETE' });
    const payload = await parsePayload(response);
    if (!response.ok) throw new Error(resolveError(response, payload, 'Erro ao deletar comentário'));
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setTotal((current) => Math.max(0, current - 1));
  }, []);

  const deleteReply = useCallback(async (replyId) => {
    const response = await fetch(`/api/content/comments/replies/${replyId}`, { method: 'DELETE' });
    const payload = await parsePayload(response);
    if (!response.ok) throw new Error(resolveError(response, payload, 'Erro ao deletar resposta'));
    setComments((current) =>
      current.map((comment) => ({
        ...comment,
        replies: (comment.replies || []).filter((reply) => reply.id !== replyId)
      }))
    );
  }, []);

  return {
    comments,
    total,
    isLoading,
    error,
    addComment,
    addReply,
    deleteComment,
    deleteReply,
    refresh: fetchComments
  };
}
