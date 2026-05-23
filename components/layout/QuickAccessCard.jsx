'use client';

import Link from 'next/link';

export default function QuickAccessCard({ emoji, title, subtitle, href }) {
  return (
    <Link className="quick-access-card" href={href}>
      <div className="quick-access-emoji">{emoji}</div>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      <style jsx>{`
        .quick-access-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg2);
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .quick-access-card:hover {
          transform: translateY(-1px);
          border-color: rgba(0, 200, 83, 0.45);
        }

        .quick-access-emoji {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(0, 200, 83, 0.16);
          border: 1px solid rgba(0, 200, 83, 0.25);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        h3 {
          margin: 0 0 3px;
          font-size: 18px;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }
      `}</style>
    </Link>
  );
}
