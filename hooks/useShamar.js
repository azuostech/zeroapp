'use client';

import { useCallback, useEffect, useState } from 'react';

export function useShamar(mode = '') {
  const [season, setSeason] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [config, setConfig] = useState(null);
  const [progress, setProgress] = useState(null);
  const [indexData, setIndexData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [locked, setLocked] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSeason = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (mode) params.set('mode', mode);
      const path = params.toString() ? `/api/shamar/seasons?${params.toString()}` : '/api/shamar/seasons';
      const res = await fetch(path, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'shamar_fetch_failed');
      }

      const nextSeason = data?.season || null;
      setSeason(nextSeason);
      setSeasons(Array.isArray(data?.seasons) ? data.seasons : nextSeason ? [nextSeason] : []);
      setConfig(data?.config || nextSeason?.config || null);
      setProgress(data?.progress || null);
      setIndexData(data?.index || data?.progress?.current_index || null);
      setProfile(data?.profile || null);
      setLocked(Boolean(data?.locked));
      setUnlockProgress(data?.unlock_progress || null);
    } catch (fetchError) {
      setSeason(null);
      setSeasons([]);
      setConfig(null);
      setProgress(null);
      setIndexData(null);
      setProfile(null);
      setLocked(false);
      setUnlockProgress(null);
      setError(fetchError?.message || 'shamar_fetch_failed');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchSeason();
  }, [fetchSeason]);

  return {
    season,
    seasons,
    config,
    progress,
    indexData,
    profile,
    locked,
    unlockProgress,
    error,
    isLoading,
    refresh: fetchSeason
  };
}
