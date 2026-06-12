'use client';

import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';

const TIER_LABELS = {
  LIVRE: 'Livre',
  MOVIMENTO: 'Mentorado',
  ACELERACAO: 'Aceleração',
  AUTOGOVERNO: 'Autogoverno'
};

export default function ProgramCard({ program, onClick }) {
  const isLocked = program?.visibility === 'locked' || Boolean(program?.locked);
  const progress = Math.max(0, Math.min(100, Number(program?.progresso_pct || 0)));
  const thumbnailUrl = resolveImageUrlForDisplay(program?.thumbnail_url);

  return (
    <button type="button" className={`program-card ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && onClick?.(program)} disabled={isLocked}>
      <div className="cover">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <span className="cover-icon">📚</span>}
        <span className="tier-badge">{isLocked ? 'Bloqueado' : TIER_LABELS[program?.tier_required] || 'Programa'}</span>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="body">
        <h2>{program?.title || 'Programa'}</h2>
        <p>{program?.description || 'Conteúdo da área de membros.'}</p>
        <footer>
          <span>{program?.sessions_count || 0} sessões</span>
          <span>{program?.total_aulas || 0} aulas</span>
          <strong>
            {program?.aulas_concluidas || 0}/{program?.total_aulas || 0} ✓
          </strong>
        </footer>
      </div>

      <style jsx>{`
        .program-card {
          width: 100%;
          text-align: left;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-nav);
          background: var(--bg2);
          color: var(--text);
          padding: 0;
          overflow: hidden;
          cursor: pointer;
          transition: var(--transition);
          min-height: 0;
        }

        .program-card:not(.locked):hover {
          border-color: var(--green-mid);
          transform: translateY(-1px);
        }

        .program-card.locked {
          opacity: 0.5;
          cursor: default;
        }

        .cover {
          height: 120px;
          background: linear-gradient(135deg, var(--green-accent), var(--bg-card));
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(0.9) brightness(0.72);
        }

        .locked .cover img,
        .locked .cover-icon {
          filter: grayscale(1);
        }

        .cover-icon {
          font-size: 44px;
        }

        .tier-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          border: 1px solid var(--green-mid);
          border-radius: var(--radius-full);
          background: color-mix(in srgb, var(--bg) 72%, transparent);
          color: var(--green);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .progress-track {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 4px;
          background: var(--border-2);
        }

        .progress-track span {
          display: block;
          height: 100%;
          background: var(--green);
        }

        .body {
          padding: 13px;
        }

        h2 {
          margin: 0 0 6px;
          font-size: 16px;
          line-height: 1.22;
          font-weight: 900;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 12px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          color: var(--text-2);
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }

        footer strong {
          margin-left: auto;
          color: var(--green);
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        footer span {
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </button>
  );
}
