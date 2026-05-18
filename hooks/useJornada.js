'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FASES, getProgressInfo } from '@/src/modules/coins/domain/jornada-phases';

function parseTransactions(payload) {
  if (Array.isArray(payload?.transactions)) return payload.transactions;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function parseBalance(payload) {
  const balance = payload?.balance && typeof payload.balance === 'object' ? payload.balance : {};
  return {
    coinsAtual: Number(balance?.coins || 0),
    coinsTotal: Number(balance?.coins_total || 0)
  };
}

export function useJornada() {
  const [coinsAtual, setCoinsAtual] = useState(0);
  const [coinsTotal, setCoinsTotal] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [faseFromApi, setFaseFromApi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('/api/coins/history?limit=50', {
        cache: 'no-store',
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar jornada');
      }

      const balance = parseBalance(payload);
      setCoinsAtual(balance.coinsAtual);
      setCoinsTotal(balance.coinsTotal);
      setTransactions(parseTransactions(payload));
      setFaseFromApi(payload?.fase_atual || null);
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('Tempo de resposta esgotado ao carregar jornada');
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar jornada');
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const derivedProgress = useMemo(() => getProgressInfo(coinsTotal), [coinsTotal]);
  const faseAtual = faseFromApi
    ? {
        ...derivedProgress.faseAtual,
        ...faseFromApi
      }
    : derivedProgress.faseAtual;

  return {
    coinsAtual,
    coinsTotal,
    faseAtual,
    progressoPct: Number(faseFromApi?.progresso_pct ?? derivedProgress.progressoPct),
    coinsParaProxima: Number(faseFromApi?.coins_para_proxima ?? derivedProgress.coinsParaProxima),
    proximaFase: derivedProgress.proximaFase,
    transactions,
    fases: FASES,
    isLoading,
    error,
    refresh
  };
}
