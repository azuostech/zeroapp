'use client';

import { useCallback, useEffect, useState } from 'react';

function toQueryString(filter) {
  const search = new URLSearchParams();
  if (filter?.tipo) search.set('tipo', String(filter.tipo).toLowerCase());
  if (filter?.tier) search.set('tier', String(filter.tier).toUpperCase());
  const query = search.toString();
  return query ? `?${query}` : '';
}

function sortByOrder(items) {
  return [...items].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
}

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
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }
  if (typeof payload?.raw === 'string' && payload.raw.trim()) {
    return payload.raw.trim();
  }
  return `${fallback} (${response.status})`;
}

export function useAdminContent() {
  const [content, setContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilterState] = useState({ tipo: '', tier: '' });
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async (activeFilter) => {
    const response = await fetch(`/api/admin/content${toQueryString(activeFilter)}`, {
      cache: 'no-store'
    });
    const payload = await parsePayload(response);

    if (!response.ok) {
      throw new Error(resolveError(response, payload, 'Erro ao carregar conteúdos'));
    }

    return Array.isArray(payload?.content) ? payload.content : [];
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await fetchContent(filter);
      setContent(sortByOrder(list));
    } catch (err) {
      setContent([]);
      setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdos');
    } finally {
      setIsLoading(false);
    }
  }, [fetchContent, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setFilter = useCallback((next) => {
    setFilterState((current) => ({ ...current, ...(next || {}) }));
  }, []);

  const createContent = useCallback(
    async (payload) => {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      const parsed = await parsePayload(response);

      if (!response.ok) {
        throw new Error(resolveError(response, parsed, 'Erro ao criar conteúdo'));
      }

      if (parsed?.content) {
        setContent((current) => sortByOrder([...current, parsed.content]));
      } else {
        await refresh();
      }

      return parsed;
    },
    [refresh]
  );

  const updateContent = useCallback(async (id, updates) => {
    const response = await fetch(`/api/admin/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates || {})
    });
    const parsed = await parsePayload(response);

    if (!response.ok) {
      throw new Error(resolveError(response, parsed, 'Erro ao atualizar conteúdo'));
    }

    if (parsed?.content) {
      setContent((current) =>
        sortByOrder(current.map((item) => (item.id === id ? parsed.content : item)))
      );
    }

    return parsed;
  }, []);

  const togglePublish = useCallback(
    async (id, isPublished) => {
      let previous = null;
      setContent((current) => {
        previous = current;
        return current.map((item) => (item.id === id ? { ...item, is_published: isPublished } : item));
      });

      try {
        await updateContent(id, { is_published: isPublished });
      } catch (err) {
        if (previous) setContent(previous);
        throw err;
      }
    },
    [updateContent]
  );

  const deleteContent = useCallback(async (id) => {
    const response = await fetch(`/api/admin/content/${id}`, {
      method: 'DELETE'
    });
    const parsed = await parsePayload(response);

    if (!response.ok) {
      throw new Error(resolveError(response, parsed, 'Erro ao remover conteúdo'));
    }

    setContent((current) => current.filter((item) => item.id !== id));
    return parsed;
  }, []);

  return {
    content,
    isLoading,
    filter,
    setFilter,
    createContent,
    updateContent,
    togglePublish,
    deleteContent,
    refresh,
    error
  };
}
