'use client';

import { useCallback, useEffect, useState } from 'react';

export function useProgramDetail(programId) {
  const [program, setProgram] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!programId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/content/programs/${programId}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'program_detail_fetch_failed'));
      setProgram(payload?.program || null);
      setSessions(Array.isArray(payload?.sessions) ? payload.sessions : []);
    } catch (_) {
      setProgram(null);
      setSessions([]);
      setError('Não foi possível carregar este programa agora.');
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { program, sessions, isLoading, error, refresh };
}
