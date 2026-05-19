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

export function useIdentity(targetUserId = null) {
  const [declarations, setDeclarations] = useState([]);
  const [total, setTotal] = useState(0);
  const [ultima, setUltima] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(withUserQuery('/api/mavf/identity', targetUserId), {
        cache: 'no-store'
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao carregar identidade'));
      }

      const nextDeclarations = Array.isArray(payload?.declarations) ? payload.declarations : [];
      setDeclarations(nextDeclarations);
      setTotal(Number(payload?.total || nextDeclarations.length));
      setUltima(payload?.ultima || (nextDeclarations.length > 0 ? nextDeclarations[nextDeclarations.length - 1] : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar identidade');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addDeclaration = useCallback(
    async ({ declaracao, contexto, encontro_ref }) => {
      const res = await fetch('/api/mavf/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declaracao,
          contexto,
          encontro_ref,
          ...(targetUserId ? { user_id: targetUserId } : {})
        })
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao registrar identidade'));
      }

      if (payload?.declaration) {
        setDeclarations((prev) => [...prev, payload.declaration]);
        setTotal((prev) => Number(prev || 0) + 1);
        setUltima(payload.declaration);
      }

      return payload;
    },
    [targetUserId]
  );

  const removeDeclaration = useCallback(
    async (id) => {
      const res = await fetch(withUserQuery(`/api/mavf/identity/${id}`, targetUserId), {
        method: 'DELETE'
      });

      const payload = await parseApiPayload(res);
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(res, payload, 'Erro ao remover declaração'));
      }

      if (typeof window !== 'undefined' && payload?.balance) {
        window.dispatchEvent(
          new CustomEvent('zero:coins-updated', {
            detail: {
              sourceId: 'mavf-identity-remove',
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

      setDeclarations((prev) => prev.filter((declaration) => declaration.id !== id));
      await fetchData();

      return payload;
    },
    [fetchData, targetUserId]
  );

  return {
    declarations,
    total,
    ultima,
    isLoading,
    error,
    addDeclaration,
    removeDeclaration,
    refresh: fetchData
  };
}
