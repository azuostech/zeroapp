'use client';

import { useCallback, useEffect, useState } from 'react';

function normalizeTipo(tipo) {
  const value = String(tipo || '').trim().toLowerCase();
  if (!value || value === 'all' || value === 'todos') return null;
  return value;
}

export function useContent(tipo = null) {
  const [content, setContent] = useState([]);
  const [bloqueado, setBloqueado] = useState([]);
  const [tierUsuario, setTierUsuario] = useState('DESPERTAR');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setWarning(null);

      const normalized = normalizeTipo(tipo);
      const url = normalized ? `/api/content?tipo=${encodeURIComponent(normalized)}` : '/api/content';
      const res = await fetch(url, { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(payload?.error || 'content_fetch_failed'));
      }

      setContent(Array.isArray(payload?.content) ? payload.content : []);
      setBloqueado(Array.isArray(payload?.bloqueado) ? payload.bloqueado : []);
      setTierUsuario(String(payload?.tier_usuario || 'DESPERTAR').toUpperCase());
      setWarning(payload?.blocked_warning ? String(payload.blocked_warning) : null);
    } catch (_) {
      setContent([]);
      setBloqueado([]);
      setTierUsuario('DESPERTAR');
      setError('Não foi possível carregar os conteúdos agora.');
    } finally {
      setIsLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    content,
    bloqueado,
    tierUsuario,
    isLoading,
    error,
    warning,
    refetch: fetchContent
  };
}
