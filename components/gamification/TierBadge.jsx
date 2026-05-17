'use client';

import { getTierInfo } from '@/src/modules/profile/domain/tier-config';

const SIZE_CLASS = {
  sm: { wrap: '28px', icon: '14px', label: '11px' },
  md: { wrap: '36px', icon: '18px', label: '12px' },
  lg: { wrap: '52px', icon: '26px', label: '13px' }
};

export function TierBadge({ tier = 'DESPERTAR', size = 'md', showName = true, className = '' }) {
  const safeSize = size === 'sm' || size === 'lg' ? size : 'md';
  const cfg = getTierInfo(tier);
  const sz = SIZE_CLASS[safeSize];

  return (
    <div className={`tier-badge-wrap ${className}`} title={`Tier ${cfg.name}`}>
      <div className="tier-badge-circle">
        <span className="tier-badge-icon">{cfg.icon}</span>
      </div>
      {showName ? <span className="tier-badge-name">{cfg.name}</span> : null}

      <style jsx>{`
        .tier-badge-wrap {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .tier-badge-circle {
          width: ${sz.wrap};
          height: ${sz.wrap};
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: ${cfg.gradient};
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.18) inset;
          flex-shrink: 0;
        }

        .tier-badge-icon {
          font-size: ${sz.icon};
          line-height: 1;
        }

        .tier-badge-name {
          font-size: ${sz.label};
          font-weight: 700;
          letter-spacing: 0.2px;
          color: var(--dim, #4a5e52);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

