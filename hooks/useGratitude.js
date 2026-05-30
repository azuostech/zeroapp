'use client';

import { useCallback, useEffect, useState } from 'react';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
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

export function useGratitude(targetUserId = null) {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ total: 0, streak: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(withUserQuery('/api/mavf/gratitude', targetUserId), {
        cache: 'no-store'
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao carregar gratidão'));
      }

      setEntries(Array.isArray(payload?.entries) ? payload.entries : []);
      setStats(payload?.stats && typeof payload.stats === 'object' ? payload.stats : { total: 0, streak: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar gratidão');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addEntry = useCallback(
    async ({ descricao, categoria, share_in_feed = false }) => {
      const res = await fetch('/api/mavf/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao,
          categoria,
          share_in_feed: Boolean(share_in_feed),
          ...(targetUserId ? { user_id: targetUserId } : {})
        })
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao registrar gratidão'));
      }

      if (payload?.entry) {
        setEntries((prev) => [payload.entry, ...prev]);
        setStats((prev) => ({
          total: Number(prev?.total || 0) + 1,
          streak: Number(payload?.stats?.streak ?? prev?.streak ?? 0)
        }));
      }

      return payload;
    },
    [targetUserId]
  );

  const removeEntry = useCallback(
    async (id) => {
      const res = await fetch(withUserQuery(`/api/mavf/gratitude/${id}`, targetUserId), {
        method: 'DELETE'
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao remover gratidão'));
      }

      if (typeof window !== 'undefined' && payload?.balance) {
        window.dispatchEvent(
          new CustomEvent('zero:coins-updated', {
            detail: {
              sourceId: 'mavf-gratitude-remove',
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

      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setStats((prev) => ({
        total: Math.max(0, Number(prev?.total || 0) - 1),
        streak: Number(prev?.streak || 0)
      }));

      await fetchData();
      return payload;
    },
    [fetchData, targetUserId]
  );

  return {
    entries,
    stats,
    isLoading,
    error,
    addEntry,
    removeEntry,
    refresh: fetchData
  };
}
