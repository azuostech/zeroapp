'use client';

import { useCallback, useEffect, useState } from 'react';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

export function useMavfSummary(targetUserId = null) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(withUserQuery('/api/mavf/summary', targetUserId), {
        cache: 'no-store'
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Erro ao carregar resumo MAVF');
      }

      setSummary(payload || null);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : 'Erro ao carregar resumo MAVF');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    isLoading,
    error,
    refresh: fetchData
  };
}
