'use client';

import Link from 'next/link';

export default function QuickAccessCard({ emoji, title, subtitle, href }) {
  return (
    <Link className="quick-access-card card card-interactive" href={href}>
      <div className="quick-access-emoji">{emoji}</div>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      <style jsx>{`
        .quick-access-card {
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
        }

        .quick-access-card:hover {
          border-color: var(--green-mid);
        }

        .quick-access-card:hover .quick-access-emoji {
          filter: drop-shadow(0 4px 10px var(--green-glow));
        }

        .quick-access-emoji {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: var(--green-dim);
          border: 1px solid var(--green-mid);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          transition: var(--transition);
        }

        h3 {
          margin: 0 0 3px;
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 11px;
        }
      `}</style>
    </Link>
  );
}
