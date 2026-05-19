'use client';

import { useCallback, useEffect, useState } from 'react';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

function isWithinLastDays(createdAt, days) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return date >= threshold;
}

async function parseApiPayload(response) {
  const rawText = await response.text();

  if (!rawText) return {};

  try {
    return JSON.parse(rawText);
  } catch (_) {
    return { raw: rawText };
  }
}

function resolveApiErrorMessage(response, payload, fallback) {
  const message = typeof payload?.error === 'string' && payload.error.trim() ? payload.error.trim() : null;
  if (message) return message;

  if (typeof payload?.raw === 'string' && payload.raw.trim()) {
    const compact = payload.raw.replace(/\s+/g, ' ').trim().slice(0, 180);
    if (compact) return compact;
  }

  return `${fallback} (${response.status})`;
}

export function useGains(targetUserId = null) {
  const [gains, setGains] = useState([]);
  const [stats, setStats] = useState({ total: 0, semana: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(withUserQuery('/api/mavf/gains?limit=50', targetUserId), {
        cache: 'no-store'
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao carregar ganhos'));
      }

      setGains(Array.isArray(payload?.gains) ? payload.gains : []);
      setStats(payload?.stats && typeof payload.stats === 'object' ? payload.stats : { total: 0, semana: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ganhos');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addGain = useCallback(
    async ({ descricao, tamanho }) => {
      const res = await fetch('/api/mavf/gains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao,
          tamanho,
          ...(targetUserId ? { user_id: targetUserId } : {})
        })
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao registrar ganho'));
      }

      if (payload?.gain) {
        setGains((prev) => [payload.gain, ...prev]);
        setStats((prev) => ({
          total: Number(prev?.total || 0) + 1,
          semana: Number(prev?.semana || 0) + 1
        }));
      }

      return payload;
    },
    [targetUserId]
  );

  const removeGain = useCallback(
    async (id) => {
      const res = await fetch(withUserQuery(`/api/mavf/gains/${id}`, targetUserId), {
        method: 'DELETE'
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao remover ganho'));
      }

      if (typeof window !== 'undefined' && payload?.balance) {
        window.dispatchEvent(
          new CustomEvent('zero:coins-updated', {
            detail: {
              sourceId: 'mavf-gain-remove',
              payload: {
                coins: Number(payload.balance.coins || 0),
                coins_total: Number(payload.balance.coins_total || 0),
                phase: String(payload.balance.phase || 'BOMBEIRO'),
                amount_awarded: Number(payload.balance.amount_reverted || 0) * -1,
                triggerAnimation: false
              }
            }
          })
        );
      }

      let removed = null;
      setGains((prev) => {
        const found = prev.find((item) => item.id === id) || null;
        removed = found;
        return prev.filter((item) => item.id !== id);
      });

      setStats((prev) => ({
        total: Math.max(0, Number(prev?.total || 0) - 1),
        semana: removed && isWithinLastDays(removed.created_at, 7) ? Math.max(0, Number(prev?.semana || 0) - 1) : Number(prev?.semana || 0)
      }));

      return payload;
    },
    [targetUserId]
  );

  return {
    gains,
    stats,
    isLoading,
    error,
    addGain,
    removeGain,
    refresh: fetchData
  };
}
