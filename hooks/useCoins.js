'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const DEFAULT_PHASE = 'BOMBEIRO';
const COINS_UPDATED_EVENT = 'zero:coins-updated';

function normalizeCoinsPayload(payload) {
  const base = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};
  const phaseRaw = payload?.phase ?? payload?.new_phase ?? base?.phase;
  const phase = typeof phaseRaw === 'string' ? phaseRaw : phaseRaw?.phase || DEFAULT_PHASE;

  return {
    coins: Number(base?.coins ?? payload?.coins ?? payload?.new_coins ?? 0),
    coinsTotal: Number(base?.coins_total ?? payload?.coins_total ?? payload?.new_total ?? 0),
    phase
  };
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

export function useCoins() {
  const [coins, setCoins] = useState(0);
  const [coinsTotal, setCoinsTotal] = useState(0);
  const [phase, setPhase] = useState(DEFAULT_PHASE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [lastAwardAmount, setLastAwardAmount] = useState(0);
  const sourceIdRef = useRef(`coins-${Math.random().toString(36).slice(2)}`);

  const applyBalance = useCallback((payload) => {
    const normalized = normalizeCoinsPayload(payload);
    setCoins(normalized.coins);
    setCoinsTotal(normalized.coinsTotal);
    setPhase(normalized.phase);
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/coins/balance', { cache: 'no-store' });
      const payload = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao carregar saldo de coins');
      }

      applyBalance(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [applyBalance]);

  const clearAnimation = useCallback(() => {
    setShowAnimation(false);
    setLastAwardAmount(0);
  }, []);

  const broadcastBalanceUpdate = useCallback((payload) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(
        new CustomEvent(COINS_UPDATED_EVENT, {
          detail: {
            sourceId: sourceIdRef.current,
            payload
          }
        })
      );
    } catch (_) {
      // no-op
    }
  }, []);

  const awardCoins = useCallback(
    async (actionType, options = {}) => {
      const {
        showToast = true,
        showAnimation: allowAnimation = true,
        showErrorToast = true,
        requestPayload = {},
        ...legacyPayload
      } = options || {};

      const mergedRequestPayload =
        requestPayload && typeof requestPayload === 'object' && !Array.isArray(requestPayload) ? requestPayload : {};

      const body = {
        action_type: actionType,
        ...legacyPayload,
        ...mergedRequestPayload
      };

      try {
        const response = await fetch('/api/coins/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const payload = await parseJsonSafe(response);
        if (!response.ok) {
          throw new Error(payload?.error || 'Erro ao conceder coins');
        }

        applyBalance(payload);

        const amountAwarded = Number(payload?.amount_awarded ?? payload?.data?.amount ?? 0);
        if (amountAwarded > 0) {
          if (showToast) {
            const message = payload?.description ? `+${amountAwarded} ZeroCoins! ${payload.description}` : `+${amountAwarded} ZeroCoins!`;
            toast.success(message, {
              icon: '🪙',
              duration: 4200
            });
          }

          if (allowAnimation) {
            setLastAwardAmount(amountAwarded);
            setShowAnimation(true);
          }
        }

        broadcastBalanceUpdate({
          coins: Number(payload?.new_coins ?? payload?.data?.coins ?? 0),
          coins_total: Number(payload?.new_total ?? payload?.data?.coins_total ?? 0),
          phase: String(payload?.new_phase ?? payload?.data?.phase ?? phase),
          amount_awarded: amountAwarded,
          triggerAnimation: Boolean(allowAnimation && amountAwarded > 0)
        });

        return payload;
      } catch (err) {
        if (showErrorToast) {
          toast.error('Erro ao adicionar ZeroCoins');
        }
        throw err;
      }
    },
    [applyBalance, broadcastBalanceUpdate, phase]
  );

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleExternalUpdate = (event) => {
      const detail = event?.detail;
      if (!detail || detail.sourceId === sourceIdRef.current) return;

      const payload = detail.payload || {};
      applyBalance(payload);

      if (payload.triggerAnimation && Number(payload.amount_awarded) > 0) {
        setLastAwardAmount(Number(payload.amount_awarded));
        setShowAnimation(true);
      }
    };

    window.addEventListener(COINS_UPDATED_EVENT, handleExternalUpdate);
    return () => {
      window.removeEventListener(COINS_UPDATED_EVENT, handleExternalUpdate);
    };
  }, [applyBalance]);

  return {
    coins,
    coinsTotal,
    phase,
    loading,
    error,
    awardCoins,
    refresh: fetchBalance,
    showAnimation,
    lastAwardAmount,
    clearAnimation
  };
}
