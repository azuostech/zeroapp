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
  const raw = typeof payload?.raw === 'string' ? payload.raw.trim() : '';
  const contentType = response.headers?.get?.('content-type') || '';
  const isHtmlError =
    contentType.includes('text/html') ||
    raw.toLowerCase().startsWith('<!doctype') ||
    raw.toLowerCase().startsWith('<html') ||
    raw.includes('__NEXT_DATA__');
  if (raw && !isHtmlError) return raw;
  return `${fallback} (${response.status})`;
}

function sortPrograms(items) {
  return [...(items || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
}

async function requestJson(url, options, fallback) {
  const response = await fetch(url, options);
  const payload = await parsePayload(response);
  if (!response.ok) throw new Error(resolveError(response, payload, fallback));
  return payload;
}

export function useAdminPrograms() {
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = await requestJson('/api/admin/programs', { cache: 'no-store' }, 'Erro ao carregar programas');
      setPrograms(sortPrograms(payload?.programs));
    } catch (err) {
      setPrograms([]);
      setError(err instanceof Error ? err.message : 'Erro ao carregar programas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProgram = useCallback(
    async (payload) => {
      const parsed = await requestJson(
        '/api/admin/programs',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {})
        },
        'Erro ao criar programa'
      );
      await refresh();
      return parsed;
    },
    [refresh]
  );

  const updateProgram = useCallback(
    async (id, updates) => {
      const parsed = await requestJson(
        `/api/admin/programs/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates || {})
        },
        'Erro ao atualizar programa'
      );
      await refresh();
      return parsed;
    },
    [refresh]
  );

  const deleteProgram = useCallback(
    async (id) => {
      const parsed = await requestJson(`/api/admin/programs/${id}`, { method: 'DELETE' }, 'Erro ao remover programa');
      await refresh();
      return parsed;
    },
    [refresh]
  );

  const createSession = useCallback(
    async (programId, payload) => {
      const parsed = await requestJson(
        `/api/admin/programs/${programId}/sessions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {})
        },
        'Erro ao criar sessão'
      );
      await refresh();
      return parsed;
    },
    [refresh]
  );

  const updateSession = useCallback(
    async (id, updates) => {
      const parsed = await requestJson(
        `/api/admin/sessions/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates || {})
        },
        'Erro ao atualizar sessão'
      );
      await refresh();
      return parsed;
    },
    [refresh]
  );

  const deleteSession = useCallback(
    async (id) => {
      const parsed = await requestJson(`/api/admin/sessions/${id}`, { method: 'DELETE' }, 'Erro ao remover sessão');
      await refresh();
      return parsed;
    },
    [refresh]
  );

  return {
    programs,
    isLoading,
    error,
    refresh,
    createProgram,
    updateProgram,
    deleteProgram,
    createSession,
    updateSession,
    deleteSession
  };
}
