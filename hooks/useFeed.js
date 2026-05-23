'use client';

import { useCallback, useEffect, useState } from 'react';

export function useFeed() {
  const [events, setEvents] = useState([]);
  const [turma, setTurma] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchFeed = useCallback(async (cursor = null) => {
    try {
      if (!cursor) setIsLoading(true);
      const url = cursor ? `/api/community/feed?limit=20&before=${encodeURIComponent(cursor)}` : '/api/community/feed?limit=20';
      const res = await window.fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('feed_fetch_failed');

      const data = await res.json().catch(() => ({}));
      const nextEvents = Array.isArray(data?.events) ? data.events : [];

      setEvents((prev) => (cursor ? [...prev, ...nextEvents] : nextEvents));
      setTurma(String(data?.turma || '').trim() || null);
      setHasMore(Boolean(data?.has_more));
      setNextCursor(data?.next_cursor || null);
    } catch (_) {
      if (!cursor) {
        setEvents([]);
        setTurma(null);
        setHasMore(false);
        setNextCursor(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor) {
      fetchFeed(nextCursor);
    }
  }, [fetchFeed, hasMore, nextCursor]);

  const react = useCallback(
    async (eventId) => {
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;
          const wasReacted = Boolean(event.user_reacted);
          return {
            ...event,
            user_reacted: !wasReacted,
            reaction_count: wasReacted ? Math.max(0, Number(event.reaction_count || 0) - 1) : Number(event.reaction_count || 0) + 1
          };
        })
      );

      try {
        const res = await window.fetch(`/api/community/feed/${eventId}/react`, {
          method: 'POST'
        });

        if (!res.ok) {
          throw new Error('react_failed');
        }

        const payload = await res.json().catch(() => ({}));
        if (typeof payload?.reacted === 'boolean') {
          setEvents((prev) =>
            prev.map((event) =>
              event.id === eventId
                ? {
                    ...event,
                    user_reacted: payload.reacted,
                    reaction_count: Number(payload.reaction_count || 0)
                  }
                : event
            )
          );
        }
      } catch (_) {
        fetchFeed();
      }
    },
    [fetchFeed]
  );

  return {
    events,
    turma,
    isLoading,
    hasMore,
    loadMore,
    react,
    refresh: () => fetchFeed()
  };
}
