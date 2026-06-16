'use client';

import { useCallback, useEffect, useState } from 'react';

export function useShamarMissions(seasonId) {
  const [missions, setMissions] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(seasonId));

  const fetchMissions = useCallback(async () => {
    if (!seasonId) {
      setMissions([]);
      setCompleted([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/shamar/missions?season_id=${encodeURIComponent(seasonId)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || 'shamar_missions_fetch_failed');

      setMissions(Array.isArray(data?.missions) ? data.missions : []);
      setCompleted(Array.isArray(data?.completed) ? data.completed : []);
      setStats(data?.stats || null);
    } catch (fetchError) {
      setMissions([]);
      setCompleted([]);
      setStats(null);
      setError(fetchError?.message || 'shamar_missions_fetch_failed');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return {
    missions,
    completed,
    stats,
    error,
    isLoading,
    refresh: fetchMissions
  };
}
