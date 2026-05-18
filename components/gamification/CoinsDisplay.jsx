'use client';

import { useMemo } from 'react';
import { useCoins } from '@/hooks/useCoins';
import { CoinAnimation } from '@/components/gamification/CoinAnimation';
import { FirstLaunchDetector } from '@/components/gamification/FirstLaunchDetector';

export function CoinsDisplay({ size = 'md', showTotal = false, className = '', enableFirstLaunchDetector = false }) {
  const { coins, coinsTotal, loading, showAnimation, lastAwardAmount, clearAnimation, awardCoins } = useCoins();
  const safeSize = size === 'sm' || size === 'lg' ? size : 'md';

  const formattedCoins = useMemo(() => new Intl.NumberFormat('pt-BR').format(coins), [coins]);
  const formattedCoinsTotal = useMemo(() => new Intl.NumberFormat('pt-BR').format(coinsTotal), [coinsTotal]);

  if (loading) {
    return (
      <div className={`coins-display coins-display--loading coins-display--${safeSize} ${className}`} aria-busy="true">
        <span className="coin-icon">🪙</span>
        <span className="coin-value">...</span>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  return (
    <>
      <div
        className={`coins-display coins-display--${safeSize} ${className}`}
        title={showTotal ? `Total histórico: ${formattedCoinsTotal} coins` : 'Saldo atual de coins'}
      >
        <span className="coin-icon">🪙</span>
        <span className="coin-value">{formattedCoins}</span>
        {showTotal ? <span className="coin-total">/ {formattedCoinsTotal}</span> : null}
        <style jsx>{baseStyles}</style>
      </div>

      {enableFirstLaunchDetector ? <FirstLaunchDetector onFirstLaunch={awardCoins} /> : null}
      {showAnimation && lastAwardAmount > 0 ? <CoinAnimation amount={lastAwardAmount} onComplete={clearAnimation} /> : null}
    </>
  );
}

const baseStyles = `
  .coins-display {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(0, 200, 83, 0.28);
    background: rgba(0, 200, 83, 0.12);
    color: var(--green, #00c853);
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }

  .coins-display--loading {
    opacity: 0.72;
  }

  .coins-display--sm {
    font-size: 12px;
    padding: 4px 8px;
  }

  .coins-display--md {
    font-size: 13px;
    padding: 5px 10px;
  }

  .coins-display--lg {
    font-size: 15px;
    padding: 7px 12px;
  }

  .coin-icon {
    line-height: 1;
    font-size: 1.1em;
  }

  .coin-value {
    font-family: 'Space Mono', monospace;
    color: var(--green, #00c853);
  }

  .coin-total {
    font-size: 0.8em;
    color: var(--muted, #8ba296);
    font-weight: 600;
  }
`;
