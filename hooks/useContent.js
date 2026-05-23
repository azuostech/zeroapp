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

  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);

      const normalized = normalizeTipo(tipo);
      const url = normalized ? `/api/content?tipo=${encodeURIComponent(normalized)}` : '/api/content';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('content_fetch_failed');

      const payload = await res.json().catch(() => ({}));
      setContent(Array.isArray(payload?.content) ? payload.content : []);
      setBloqueado(Array.isArray(payload?.bloqueado) ? payload.bloqueado : []);
      setTierUsuario(String(payload?.tier_usuario || 'DESPERTAR').toUpperCase());
    } catch (_) {
      setContent([]);
      setBloqueado([]);
      setTierUsuario('DESPERTAR');
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
    refetch: fetchContent
  };
}
