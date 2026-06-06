'use client';

import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';

const TYPE_META = {
  video: { label: 'Aula', icon: '🎥' },
  pdf: { label: 'PDF', icon: '📄' },
  tool: { label: 'Ferramenta', icon: '🔧' },
  article: { label: 'Artigo', icon: '📝' }
};

const TIER_LABELS = {
  LIVRE: 'Grátis',
  MOVIMENTO: 'Mentorado',
  ACELERACAO: 'Aceleração',
  AUTOGOVERNO: 'Autogoverno'
};

function resolveStatus(aula) {
  if (aula?.locked) return { className: 'locked', label: '🔒' };
  if (aula?.progress?.completed_at) return { className: 'done', label: '✓' };
  if (aula?.progress?.started_at) return { className: 'started', label: '▶' };
  return { className: 'empty', label: '' };
}

export default function AulaItem({ aula, onClick }) {
  const type = TYPE_META[String(aula?.content_type || '').toLowerCase()] || TYPE_META.article;
  const status = resolveStatus(aula);
  const thumbnailUrl = resolveImageUrlForDisplay(aula?.thumbnail_url);

  return (
    <button type="button" className={`aula-item ${aula?.locked ? 'locked' : ''}`} onClick={() => !aula?.locked && onClick?.(aula)} disabled={aula?.locked}>
      <div className="thumb">{thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <span>{type.icon}</span>}</div>
      <div className="info">
        <h3>{aula?.title || 'Aula'}</h3>
        <div className="badges">
          <span>{TIER_LABELS[aula?.tier_required] || 'Conteúdo'}</span>
          <span>{type.label}</span>
        </div>
      </div>
      <span className={`status ${status.className}`}>{status.label}</span>

      <style jsx>{`
        .aula-item {
          width: 100%;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          color: var(--text);
          padding: 9px;
          display: grid;
          grid-template-columns: 72px 1fr 28px;
          gap: 10px;
          align-items: center;
          text-align: left;
          cursor: pointer;
          min-height: 0;
        }

        .aula-item.locked {
          opacity: 0.45;
          cursor: default;
        }

        .thumb {
          width: 72px;
          height: 54px;
          border-radius: 10px;
          background: var(--bg3);
          display: grid;
          place-items: center;
          overflow: hidden;
          font-size: 22px;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        h3 {
          margin: 0 0 6px;
          font-size: 13px;
          line-height: 1.25;
          font-weight: 800;
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .badges span {
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-2);
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 800;
        }

        .status {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          justify-self: end;
          font-size: 13px;
          font-weight: 900;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          border: 1px solid var(--border-2);
          color: var(--text-2);
        }

        .status.done {
          background: var(--green);
          border-color: var(--green);
          color: #03150a;
        }

        .status.started {
          border-color: var(--green);
          color: var(--green);
        }

        .status.locked {
          background: var(--bg3);
          border-color: var(--border-2);
        }
      `}</style>
    </button>
  );
}
