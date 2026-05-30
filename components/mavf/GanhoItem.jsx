'use client';

import { formatShortDateLabel } from '@/src/modules/mavf/application/practices-format';

const SIZE_CONFIG = {
  pequeno: { label: '🌱 Pequeno', className: 'badge-green', coins: 10 },
  medio: { label: '⚡ Médio', className: 'badge-gold', coins: 10 },
  grande: { label: '🏆 Grande', className: 'badge-blue', coins: 20 }
};

export default function GanhoItem({ gain, onRemove }) {
  const sizeKey = String(gain?.tamanho || '').toLowerCase();
  const cfg = SIZE_CONFIG[sizeKey] || SIZE_CONFIG.pequeno;
  const dateLabel = formatShortDateLabel(gain?.created_at);

  return (
    <article className="gain-item card">
      <div className="gain-main">
        <div className="gain-top">
          <span className={`size-badge badge ${cfg.className}`}>{cfg.label}</span>
          <span className="gain-date">{dateLabel}</span>
        </div>
        <p className="gain-text">{gain?.descricao}</p>
      </div>

      <div className="gain-side">
        <strong className="gain-coins">+{cfg.coins} 🪙</strong>
        <button type="button" className="remove-btn" onClick={() => onRemove?.(gain)} aria-label="Remover ganho">
          ×
        </button>
      </div>

      <style jsx>{`
        .gain-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
        }

        .gain-main {
          min-width: 0;
          flex: 1;
        }

        .gain-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .size-badge {
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .gain-date {
          font-size: 11px;
          color: var(--text-3);
        }

        .gain-text {
          margin: 0;
          font-size: 14px;
          color: var(--text);
          line-height: 1.4;
          word-break: break-word;
        }

        .gain-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .gain-coins {
          color: var(--green);
          font-size: 13px;
          font-family: var(--font-mono);
          white-space: nowrap;
        }

        .remove-btn {
          opacity: 0;
          border: 1px solid var(--border-2);
          background: var(--bg-surface);
          color: var(--text-2);
          border-radius: 8px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          transition: var(--transition);
        }

        .gain-item:hover .remove-btn,
        .gain-item:focus-within .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          border-color: var(--red);
          color: var(--red);
        }

        @media (max-width: 768px) {
          .remove-btn {
            opacity: 1;
          }
        }
      `}</style>
    </article>
  );
}
