'use client';

import { useCallback, useEffect, useState } from 'react';

const EMPTY_CHALLENGE = {
  challenge: null,
  participations: 0,
  user_participated: false,
  progress_pct: 0
};

export function useChallenge() {
  const [challenge, setChallenge] = useState(EMPTY_CHALLENGE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/community/challenge', { cache: 'no-store' });
      if (!res.ok) throw new Error('challenge_fetch_failed');

      const payload = await res.json().catch(() => ({}));
      setChallenge({
        challenge: payload?.challenge || null,
        participations: Number(payload?.participations || 0),
        user_participated: Boolean(payload?.user_participated),
        progress_pct: Number(payload?.progress_pct || 0)
      });
    } catch (_) {
      setChallenge(EMPTY_CHALLENGE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  return { ...challenge, isLoading, refresh: fetchChallenge };
}
