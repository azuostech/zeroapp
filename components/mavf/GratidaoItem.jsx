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
    <article className="grat-item">
      <div className="grat-main">
        <div className="grat-top">
          <span className="grat-date">{formatShortDateLabel(entry?.created_at)}</span>
          <span className="grat-category">{categoryLabel}</span>
        </div>
        <p className="grat-text">{entry?.descricao}</p>
      </div>

      <button type="button" className="remove-btn" onClick={() => onRemove?.(entry)} aria-label="Remover gratidão">
        ×
      </button>

      <style jsx>{`
        .grat-item {
          border-left: 4px solid #fb7185;
          background: #181418;
          border-radius: 12px;
          border: 1px solid #3d2f35;
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
          color: #9a8f95;
        }

        .grat-category {
          font-size: 11px;
          border-radius: 999px;
          border: 1px solid rgba(251, 113, 133, 0.4);
          background: rgba(251, 113, 133, 0.15);
          color: #ffc8d1;
          padding: 3px 8px;
          font-weight: 700;
        }

        .grat-text {
          margin: 0;
          color: #f7edf0;
          line-height: 1.4;
          font-size: 14px;
          word-break: break-word;
        }

        .remove-btn {
          opacity: 0;
          border: 1px solid #4a3b41;
          background: #21191d;
          color: #b8a1a8;
          border-radius: 8px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .grat-item:hover .remove-btn,
        .grat-item:focus-within .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          border-color: #ff8a9d;
          color: #ffb7c2;
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
