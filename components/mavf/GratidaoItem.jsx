'use client';

import { formatShortDateLabel } from '@/src/modules/mavf/application/practices-format';

const CATEGORY_LABELS = {
  financeiro: '💰 Financeiro',
  crescimento: '🌱 Crescimento',
  relacionamentos: '👥 Relacionamentos',
  saude: '💚 Saúde',
  outro: '✨ Outro'
};

export default function GratidaoItem({ entry, onRemove }) {
  const categoryKey = String(entry?.categoria || '').toLowerCase();
  const categoryLabel = CATEGORY_LABELS[categoryKey] || '✨ Outro';

  return (
    <article className="grat-item card">
      <div className="grat-main">
        <div className="grat-top">
          <span className="grat-date">{formatShortDateLabel(entry?.created_at)}</span>
          <span className="grat-category badge badge-rose">{categoryLabel}</span>
        </div>
        <p className="grat-text">{entry?.descricao}</p>
      </div>

      <button type="button" className="remove-btn" onClick={() => onRemove?.(entry)} aria-label="Remover gratidão">
        ×
      </button>

      <style jsx>{`
        .grat-item {
          border-left: 3px solid var(--rose);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .grat-main {
          flex: 1;
          min-width: 0;
        }

        .grat-top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .grat-date {
          font-size: 11px;
          color: var(--text-3);
        }

        .grat-category {
          font-size: 11px;
          padding: 3px 8px;
          font-weight: 700;
        }

        .grat-text {
          margin: 0;
          color: var(--text);
          line-height: 1.4;
          font-size: 14px;
          word-break: break-word;
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

        .grat-item:hover .remove-btn,
        .grat-item:focus-within .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          border-color: var(--rose);
          color: var(--rose);
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
