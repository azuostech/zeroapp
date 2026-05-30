'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';

function resolveType(contentType) {
  const key = String(contentType || '').toLowerCase();
  if (key === 'video') return { label: 'Vídeo', icon: '🎬' };
  if (key === 'pdf') return { label: 'PDF', icon: '📄' };
  if (key === 'article') return { label: 'Artigo', icon: '📝' };
  if (key === 'tool') return { label: 'Ferramenta', icon: '🔧' };
  return { label: 'Conteúdo', icon: '📚' };
}

function resolveTier(tier) {
  const key = String(tier || '').toUpperCase();
  if (key === 'LIVRE') return { label: 'Livre', className: 'badge-green' };
  if (key === 'MOVIMENTO') return { label: 'Mentorado', className: 'badge-gold' };
  if (key === 'ACELERACAO') return { label: 'Aceleração', className: 'badge-blue' };
  if (key === 'AUTOGOVERNO') return { label: 'Autogoverno', className: 'badge-purple' };
  return { label: key || 'Livre', className: 'badge-green' };
}

function truncateUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'Sem URL';
  return value.length > 60 ? `${value.slice(0, 57)}...` : value;
}

function parseDateOnly(dateValue) {
  const value = String(dateValue || '').trim();
  if (!value) return null;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatDateLabel(dateValue) {
  const parsed = parseDateOnly(dateValue);
  if (!parsed) return '';
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function resolveReleaseStatus(disponivelEm) {
  const releaseDate = parseDateOnly(disponivelEm);
  if (!releaseDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < releaseDate) {
    return {
      kind: 'future',
      label: `🔒 Libera em ${formatDateLabel(disponivelEm)}`
    };
  }

  return {
    kind: 'ready',
    label: '✅ Disponível'
  };
}

export default function ContentAdminCard({ item, onTogglePublish, onEdit, onDelete, onUpdateOrder, isBusy = false }) {
  const type = resolveType(item?.content_type);
  const tier = resolveTier(item?.tier_required);
  const turmaExclusiva = String(item?.turma_exclusiva || '').trim();
  const releaseStatus = resolveReleaseStatus(item?.disponivel_em);
  const thumbnailUrlRaw = String(item?.thumbnail_url || '').trim();
  const thumbnailUrl = useMemo(() => resolveImageUrlForDisplay(thumbnailUrlRaw), [thumbnailUrlRaw]);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [item?.id, thumbnailUrl]);

  const handleToggle = () => {
    onTogglePublish?.(item, !Boolean(item?.is_published));
  };

  const handleDelete = () => {
    const ok = window.confirm(`Remover "${item?.title || 'este conteúdo'}"?`);
    if (!ok) return;
    onDelete?.(item);
  };

  const handleOrderBlur = (event) => {
    if (!onUpdateOrder) return;
    const next = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(next) || next === Number(item?.order_index || 0)) return;
    onUpdateOrder(item, next);
  };

  return (
    <article className={`content-admin-card card ${item?.is_published ? '' : 'draft'}`}>
      <div className="thumb" aria-hidden="true">
        {thumbnailUrl && !thumbFailed ? (
          <img src={thumbnailUrl} alt="" loading="lazy" onError={() => setThumbFailed(true)} />
        ) : (
          <span>{type.icon}</span>
        )}
      </div>

      <div className="main">
        <div className="head-row">
          <div className="title-wrap">
            <h3>{item?.title || 'Sem título'}</h3>
            {turmaExclusiva ? <span className="badge turma-badge">[{turmaExclusiva}]</span> : null}
            {releaseStatus ? (
              <span className={`badge release-badge ${releaseStatus.kind === 'future' ? 'future' : 'ready'}`}>
                {releaseStatus.label}
              </span>
            ) : null}
          </div>
          <label className={`switch-wrap ${item?.is_published ? 'on' : ''}`}>
            <input type="checkbox" checked={Boolean(item?.is_published)} onChange={handleToggle} disabled={isBusy} />
            <span>{item?.is_published ? 'Publicado' : 'Rascunho'}</span>
          </label>
        </div>

        <p className="description">{item?.description || 'Sem descrição.'}</p>

        <div className="meta-row">
          <span className="badge type-badge badge-neutral">
            {type.icon} {type.label}
          </span>
          <span className={`badge tier-badge ${tier.className}`}>
            {tier.label}
          </span>
          <label className="order-input">
            Ordem
            <input type="number" defaultValue={Number(item?.order_index || 0)} onBlur={handleOrderBlur} disabled={isBusy} />
          </label>
        </div>

        <a href={item?.url || '#'} target="_blank" rel="noreferrer" className={`url ${item?.url ? '' : 'disabled'}`}>
          {truncateUrl(item?.url)}
        </a>
      </div>

      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => onEdit?.(item)} disabled={isBusy}>
          Editar
        </button>
        <button type="button" className="btn danger" onClick={handleDelete} disabled={isBusy}>
          Deletar
        </button>
      </div>

      <style jsx>{`
        .content-admin-card {
          display: grid;
          grid-template-columns: 128px 1fr auto;
          gap: 14px;
          padding: 14px;
        }

        .content-admin-card.draft {
          opacity: 0.8;
        }

        .thumb {
          width: 128px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-2);
          background: var(--bg-surface);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .main {
          min-width: 0;
        }

        .head-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          min-width: 0;
        }

        h3 {
          margin: 0;
          font-size: 18px;
          font-family: var(--font-display);
          font-weight: 700;
          line-height: 1.2;
        }

        .switch-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-2);
          font-weight: 700;
        }

        .switch-wrap.on {
          color: var(--green);
        }

        .switch-wrap input {
          accent-color: var(--green);
        }

        .description {
          margin: 6px 0 10px;
          color: var(--text-2);
          font-size: 13px;
          line-height: 1.35;
        }

        .meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 11px;
          font-weight: 700;
        }

        .turma-badge {
          background: var(--gold-dim);
          color: var(--gold);
          border: 1px solid rgba(255, 215, 0, 0.38);
        }

        .release-badge.future {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-2);
          border: 1px solid var(--border-2);
        }

        .release-badge.ready {
          background: var(--green-dim);
          color: var(--green);
          border: 1px solid var(--green-mid);
        }

        .order-input {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-2);
        }

        .order-input input {
          width: 64px;
          border: 1px solid var(--border-2);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 5px 7px;
          font-size: 12px;
          font-family: var(--font-mono);
        }

        .url {
          margin-top: 10px;
          display: inline-block;
          color: var(--blue);
          text-decoration: none;
          font-size: 12px;
          word-break: break-all;
        }

        .url.disabled {
          pointer-events: none;
          color: var(--text-3);
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
        }

        .btn {
          border: 1px solid var(--border-2);
          border-radius: 9px;
          background: var(--bg-surface);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 10px;
          cursor: pointer;
        }

        .btn.ghost:hover {
          border-color: var(--blue);
          color: var(--blue);
        }

        .btn.danger {
          color: var(--red);
        }

        .btn.danger:hover {
          border-color: var(--red);
        }

        @media (max-width: 880px) {
          .content-admin-card {
            grid-template-columns: 96px 1fr;
          }

          .thumb {
            width: 96px;
            font-size: 24px;
          }

          .actions {
            grid-column: span 2;
            flex-direction: row;
            justify-content: flex-end;
          }
        }
      `}</style>
    </article>
  );
}
