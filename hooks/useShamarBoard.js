'use client';

import { useCallback, useEffect, useState } from 'react';

export function useShamarBoard(seasonId) {
  const [squares, setSquares] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(seasonId));

  const fetchBoard = useCallback(async () => {
    if (!seasonId) {
      setSquares([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/shamar/board?season_id=${encodeURIComponent(seasonId)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || 'shamar_board_fetch_failed');

      setSquares(Array.isArray(data?.squares) ? data.squares : []);
      setStats(data?.stats || null);
    } catch (fetchError) {
      setSquares([]);
      setStats(null);
      setError(fetchError?.message || 'shamar_board_fetch_failed');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return {
    squares,
    stats,
    error,
    isLoading,
    refresh: fetchBoard
  };
}
