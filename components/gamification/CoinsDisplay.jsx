'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCoins } from '@/hooks/useCoins';
import { CoinAnimation } from '@/components/gamification/CoinAnimation';
import { FirstLaunchDetector } from '@/components/gamification/FirstLaunchDetector';

export function CoinsDisplay({ size = 'md', showTotal = false, className = '', enableFirstLaunchDetector = false, clickable = true }) {
  const { coins, coinsTotal, loading, showAnimation, lastAwardAmount, clearAnimation, awardCoins } = useCoins();
  const router = useRouter();
  const safeSize = size === 'sm' || size === 'lg' ? size : 'md';

  const formattedCoins = useMemo(() => new Intl.NumberFormat('pt-BR').format(coins), [coins]);
  const formattedCoinsTotal = useMemo(() => new Intl.NumberFormat('pt-BR').format(coinsTotal), [coinsTotal]);

  if (loading) {
    return (
      <div className={`coins-display coin-chip gold coins-display--loading coins-display--${safeSize} ${className}`} aria-busy="true">
        <span className="coin-icon">🪙</span>
        <span className="coin-value">...</span>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  const handleClick = () => {
    if (!clickable) return;
    router.push('/jornada');
  };

  const sharedProps = {
    className: `coins-display coin-chip gold coins-display--${safeSize} ${className}`,
    title: showTotal ? `Total histórico: ${formattedCoinsTotal} coins` : 'Saldo atual de coins'
  };

  return (
    <>
      {clickable ? (
        <button type="button" {...sharedProps} onClick={handleClick} aria-label="Abrir jornada de coins">
          <span className="coin-icon">🪙</span>
          <span className="coin-value">{formattedCoins}</span>
          {showTotal ? <span className="coin-total">/ {formattedCoinsTotal}</span> : null}
          <style jsx>{baseStyles}</style>
        </button>
      ) : (
        <div {...sharedProps}>
          <span className="coin-icon">🪙</span>
          <span className="coin-value">{formattedCoins}</span>
          {showTotal ? <span className="coin-total">/ {formattedCoinsTotal}</span> : null}
          <style jsx>{baseStyles}</style>
        </div>
      )}

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
    border-radius: var(--radius-full);
    border: none;
    background: transparent;
    font-weight: 700;
    letter-spacing: 0.1px;
    white-space: nowrap;
    font-family: var(--font-mono);
  }

  .coins-display--loading {
    opacity: 0.72;
  }

  .coins-display--sm {
    font-size: 12px;
    padding: 4px 9px;
  }

  .coins-display--md {
    font-size: 13px;
    padding: 5px 10px;
  }

  .coins-display--lg {
    font-size: 15px;
    padding: 7px 12px;
  }

  button.coins-display {
    cursor: pointer;
    transition: var(--transition);
  }

  button.coins-display:hover {
    box-shadow: var(--shadow-green);
    transform: translateY(-1px);
  }

  .coin-icon {
    line-height: 1;
    font-size: 1.1em;
  }

  .coin-value {
    font-family: var(--font-mono);
    color: currentColor;
  }

  .coin-total {
    font-size: 0.8em;
    color: var(--text-3);
    font-weight: 600;
  }
`;
