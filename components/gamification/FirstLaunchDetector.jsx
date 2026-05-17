'use client';

import { useEffect } from 'react';
import { checkFirstLaunchOfMonth, getCurrentMonthMeta } from '@/lib/utils/firstLaunchDetector';

function isEligiblePath(pathname) {
  return pathname.startsWith('/app') || pathname.startsWith('/mavf');
}

export function FirstLaunchDetector({ onFirstLaunch, delayMs = 1000 }) {
  useEffect(() => {
    if (typeof onFirstLaunch !== 'function') return;
    if (typeof window === 'undefined') return;

    const timer = setTimeout(async () => {
      const pathname = window.location.pathname || '';
      if (!isEligiblePath(pathname)) return;

      try {
        const profileRes = await fetch('/api/profile/me', { cache: 'no-store' });
        if (!profileRes.ok) return;

        const payload = await profileRes.json();
        const isImpersonating = Boolean(payload?.impersonation?.active);
        const profile = payload?.profile;
        const role = String(profile?.role || '').toLowerCase();
        const status = String(profile?.status || '').toLowerCase();

        if (isImpersonating) return;
        if (role === 'admin') return;
        if (status !== 'active') return;

        const isFirstLaunch = checkFirstLaunchOfMonth();
        if (!isFirstLaunch) return;

        const { month, year } = getCurrentMonthMeta();
        await onFirstLaunch('first_launch_month', {
          showErrorToast: false,
          requestPayload: {
            metadata: {
              month,
              year,
              source: 'first_launch_detector'
            }
          }
        });
      } catch (_) {
        // silencioso para não poluir UX
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, onFirstLaunch]);

  return null;
}

