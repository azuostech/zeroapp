'use client';

import { useCallback, useState } from 'react';
import { useCoins } from '@/hooks/useCoins';
import { checkMonthCompletionData, getCurrentMonthMeta } from '@/lib/utils/checkMonthCompletion';

const STORAGE_KEY_PREFIX = 'zero_month_complete_awarded_';

function buildStorageKey(year, month) {
  return `${STORAGE_KEY_PREFIX}${year}_${month}`;
}

function markLocalAwarded(year, month) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(buildStorageKey(year, month), new Date().toISOString());
  } catch (_) {
    // no-op
  }
}

function wasLocalAwarded(year, month) {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(buildStorageKey(year, month)));
  } catch (_) {
    return false;
  }
}

export function useMonthCompletion() {
  const [checking, setChecking] = useState(false);
  const { awardCoins } = useCoins();

  const checkAndAward = useCallback(
    async ({ data, year, month, allowLocalShortCircuit = true } = {}) => {
      setChecking(true);

      try {
        const period = Number.isInteger(year) && Number.isInteger(month) ? { year, month } : getCurrentMonthMeta();

        if (!checkMonthCompletionData(data)) {
          return { awarded: false, reason: 'incomplete', ...period };
        }

        if (allowLocalShortCircuit && wasLocalAwarded(period.year, period.month)) {
          return { awarded: false, reason: 'already_awarded_local', ...period };
        }

        const response = await awardCoins('month_complete', {
          showToast: true,
          showAnimation: true,
          requestPayload: {
            metadata: {
              year: period.year,
              month: period.month,
              source: 'month_completion_hook'
            }
          }
        });

        const awardedAmount = Number(response?.amount_awarded || 0);
        if (awardedAmount > 0) {
          markLocalAwarded(period.year, period.month);
          return { awarded: true, amount: awardedAmount, ...period };
        }

        if (response?.reason === 'already_awarded_this_month') {
          markLocalAwarded(period.year, period.month);
          return { awarded: false, reason: 'already_awarded_server', ...period };
        }

        return { awarded: false, reason: 'not_awarded', ...period };
      } catch (error) {
        return { awarded: false, reason: 'error', error };
      } finally {
        setChecking(false);
      }
    },
    [awardCoins]
  );

  return {
    checkAndAward,
    checking
  };
}

