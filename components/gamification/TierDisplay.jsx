'use client';

import { useEffect, useState } from 'react';
import { TierBadge } from '@/components/gamification/TierBadge';

export function TierDisplay({ size = 'md', showName = false, className = '', userId = null }) {
  const [tier, setTier] = useState('DESPERTAR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadTier = async () => {
      try {
        const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
        const response = await fetch(`/api/user/tier${query}`, { cache: 'no-store' });
        if (!response.ok) return;

        const payload = await response.json();
        if (active) {
          setTier(String(payload?.tier || 'DESPERTAR').toUpperCase());
        }
      } catch (_) {
        // silencioso: fallback em tier default
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTier();

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className={`tier-display-skeleton ${className}`} aria-busy="true">
        <style jsx>{`
          .tier-display-skeleton {
            width: ${size === 'sm' ? '48px' : size === 'lg' ? '124px' : '72px'};
            height: ${size === 'sm' ? '24px' : size === 'lg' ? '32px' : '28px'};
            border-radius: 999px;
            background: var(--bg-surface);
            border: 1px solid var(--border-2);
            animation: pulse 1.25s ease-in-out infinite;
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 0.5;
            }
            50% {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return <TierBadge tier={tier} size={size} showName={showName} className={className} />;
}
