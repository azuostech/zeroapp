'use client';

import { useCallback, useEffect, useState } from 'react';

const EMPTY_STATS = {
  ativos_hoje: 0,
  total_membros: 0,
  coins_gerados: 0,
  completaram_mes: 0
};

export function useCommunityStats() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/community/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('stats_fetch_failed');

      const payload = await res.json().catch(() => ({}));
      setStats({
        ativos_hoje: Number(payload?.ativos_hoje || 0),
        total_membros: Number(payload?.total_membros || 0),
        coins_gerados: Number(payload?.coins_gerados || 0),
        completaram_mes: Number(payload?.completaram_mes || 0)
      });
    } catch (_) {
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats };
}
