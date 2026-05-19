'use client';

import { formatShortDateLabel } from '@/src/modules/mavf/application/practices-format';

const SIZE_CONFIG = {
  pequeno: { label: '🌱 Pequeno', className: 'size-small', coins: 10 },
  medio: { label: '⚡ Médio', className: 'size-medium', coins: 10 },
  grande: { label: '🏆 Grande', className: 'size-large', coins: 20 }
};

export default function GanhoItem({ gain, onRemove }) {
  const sizeKey = String(gain?.tamanho || '').toLowerCase();
  const cfg = SIZE_CONFIG[sizeKey] || SIZE_CONFIG.pequeno;
  const dateLabel = formatShortDateLabel(gain?.created_at);

  return (
    <article className="gain-item">
      <div className="gain-main">
        <div className="gain-top">
          <span className={`size-badge ${cfg.className}`}>{cfg.label}</span>
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
          border: 1px solid #2f3a32;
          background: #131a16;
          border-radius: 12px;
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
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .size-small {
          background: rgba(0, 200, 83, 0.15);
          border-color: rgba(0, 200, 83, 0.35);
          color: #8cffb4;
        }

        .size-medium {
          background: rgba(255, 193, 7, 0.14);
          border-color: rgba(255, 193, 7, 0.32);
          color: #ffe073;
        }

        .size-large {
          background: rgba(33, 150, 243, 0.14);
          border-color: rgba(33, 150, 243, 0.32);
          color: #84c9ff;
        }

        .gain-date {
          font-size: 11px;
          color: #7f8c83;
        }

        .gain-text {
          margin: 0;
          font-size: 14px;
          color: #e6efe8;
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
          color: #00c853;
          font-size: 13px;
          white-space: nowrap;
        }

        .remove-btn {
          opacity: 0;
          border: 1px solid #37433b;
          background: #191f1b;
          color: #97a69d;
          border-radius: 8px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .gain-item:hover .remove-btn,
        .gain-item:focus-within .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          border-color: #d96a6a;
          color: #ff8a8a;
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
