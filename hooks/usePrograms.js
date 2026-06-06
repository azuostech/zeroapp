'use client';

import { useCallback, useEffect, useState } from 'react';

export function usePrograms() {
  const [programs, setPrograms] = useState([]);
  const [tierUsuario, setTierUsuario] = useState('DESPERTAR');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/content/programs', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'programs_fetch_failed'));
      setPrograms(Array.isArray(payload?.programs) ? payload.programs : []);
      setTierUsuario(String(payload?.tier_usuario || 'DESPERTAR').toUpperCase());
    } catch (_) {
      setPrograms([]);
      setTierUsuario('DESPERTAR');
      setError('Não foi possível carregar os programas agora.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { programs, tierUsuario, isLoading, error, refresh };
}
