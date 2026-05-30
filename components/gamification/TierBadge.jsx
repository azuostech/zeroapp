'use client';

import { getTierInfo } from '@/src/modules/profile/domain/tier-config';

const SIZE_CLASS = {
  sm: { icon: '13px', label: '11px', padding: '4px 8px' },
  md: { icon: '15px', label: '12px', padding: '5px 10px' },
  lg: { icon: '17px', label: '13px', padding: '7px 12px' }
};

const TIER_CLASS = {
  DESPERTAR: 'badge-green',
  MOVIMENTO: 'badge-gold',
  ACELERACAO: 'badge-blue',
  AUTOGOVERNO: 'badge-purple'
};

export function TierBadge({ tier = 'DESPERTAR', size = 'md', showName = true, className = '' }) {
  const safeSize = size === 'sm' || size === 'lg' ? size : 'md';
  const cfg = getTierInfo(tier);
  const sz = SIZE_CLASS[safeSize];
  const badgeClass = TIER_CLASS[cfg.tier] || 'badge-green';

  return (
    <div className={`tier-badge-wrap ${className}`} title={`Tier ${cfg.name}`} aria-label={`Tier ${cfg.name}`}>
      <span className={`tier-badge badge ${badgeClass}`}>
        <span className="tier-badge-icon">{cfg.icon}</span>
        {showName ? <span className="tier-badge-name">{cfg.name}</span> : null}
      </span>

      <style jsx>{`
        .tier-badge-wrap {
          display: inline-flex;
          align-items: center;
        }

        .tier-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: ${sz.padding};
        }

        .tier-badge-icon {
          font-size: ${sz.icon};
          line-height: 1;
        }

        .tier-badge-name {
          font-size: ${sz.label};
          font-weight: 800;
          letter-spacing: 0.2px;
          line-height: 1;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
