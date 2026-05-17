'use client';

import { useEffect, useState } from 'react';

export function CoinAnimation({ amount, onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (typeof onComplete === 'function') onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible || !amount) return null;

  return (
    <div className="coin-fly" aria-hidden="true">
      <div className="coin-fly-pill">
        <span className="coin-fly-icon">🪙</span>
        <span className="coin-fly-amount">+{amount}</span>
      </div>

      <style jsx>{`
        .coin-fly {
          position: fixed;
          left: 50%;
          bottom: 86px;
          transform: translateX(-50%);
          z-index: 1300;
          pointer-events: none;
          animation: coinFly 1.5s ease-out forwards;
        }

        .coin-fly-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #00c853, #00a54a);
          color: #ffffff;
          padding: 10px 16px;
          border-radius: 999px;
          box-shadow: 0 16px 35px rgba(0, 200, 83, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .coin-fly-icon {
          font-size: 24px;
          line-height: 1;
        }

        .coin-fly-amount {
          font-family: 'Space Mono', monospace;
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
        }

        @keyframes coinFly {
          0% {
            transform: translate(-50%, 0) scale(1);
            opacity: 0;
          }

          12% {
            opacity: 1;
          }

          55% {
            transform: translate(-50%, -72px) scale(1.12);
            opacity: 1;
          }

          100% {
            transform: translate(-50%, -122px) scale(0.86);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

