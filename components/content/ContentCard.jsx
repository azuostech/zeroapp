'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';

const TIER_BADGES = {
  LIVRE: { label: 'Grátis', className: 'tier-livre' },
  MOVIMENTO: { label: 'Mentorado', className: 'tier-movimento' },
  ACELERACAO: { label: 'Aceleração', className: 'tier-aceleracao' },
  AUTOGOVERNO: { label: 'Autogoverno', className: 'tier-autogoverno' }
};

const TYPE_META = {
  video: { icon: '🎬', label: 'Aula' },
  tool: { icon: '🧮', label: 'Ferramenta' },
  pdf: { icon: '📄', label: 'PDF' },
  article: { icon: '📰', label: 'Artigo' }
};

function resolveTierBadge(tierRequired) {
  const key = String(tierRequired || '').toUpperCase();
  return TIER_BADGES[key] || TIER_BADGES.LIVRE;
}

function resolveTypeMeta(contentType) {
  const key = String(contentType || '').toLowerCase();
  return TYPE_META[key] || { icon: '📚', label: 'Conteudo' };
}

export default function ContentCard({ item, locked = false, onClick = null }) {
  const tier = resolveTierBadge(item?.tier_required);
  const type = resolveTypeMeta(item?.content_type);
  const itemId = String(item?.id || '').trim();
  const internalHref = itemId ? `/conteudo/${itemId}` : null;
  const lockedReason = String(item?.locked_reason || '').trim();
  const lockedDescription = lockedReason || 'Ainda não disponível';
  const thumbnailUrlRaw = String(item?.thumbnail_url || '').trim();
  const thumbnailUrl = useMemo(() => resolveImageUrlForDisplay(thumbnailUrlRaw), [thumbnailUrlRaw]);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [item?.id, thumbnailUrl]);

  const cardBody = (
    <>
      <div className="content-thumb" aria-hidden="true">
        {thumbnailUrl && !thumbFailed ? (
          <img src={thumbnailUrl} alt="" loading="lazy" onError={() => setThumbFailed(true)} />
        ) : (
          <span>{type.icon}</span>
        )}
      </div>

      <div className="content-main">
        <div className="content-top-row">
          <span className={`tier-badge badge ${locked ? 'badge-neutral' : tier.className}`}>
            {locked ? '🔒 Bloqueado' : tier.label}
          </span>
          <span className="type-badge badge badge-neutral">{type.label}</span>
          {locked ? <span className="type-badge badge badge-neutral">{lockedDescription}</span> : null}
        </div>

        <h3>{item?.title || 'Conteudo'}</h3>
        <p>{locked ? 'Conteúdo bloqueado para seu tier atual.' : item?.description || 'Conteudo da area do aluno.'}</p>
      </div>

      <style jsx>{`
        .content-thumb {
          width: 128px;
          min-width: 128px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-lg);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--green-dim), color-mix(in srgb, var(--bg-surface) 80%, transparent));
          border: 1px solid var(--green-mid);
          overflow: hidden;
        }

        .content-thumb span {
          font-size: 28px;
        }

        .content-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: calc(var(--radius-lg) - 1px);
        }

        .content-main {
          min-width: 0;
        }

        .content-top-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 5px;
        }

        .tier-badge,
        .type-badge {
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 700;
        }

        .tier-badge.tier-livre {
          background: var(--green);
          border-color: transparent;
          color: var(--bg);
        }

        .tier-badge.tier-movimento {
          background: var(--gold);
          border-color: transparent;
          color: var(--bg);
        }

        .tier-badge.tier-aceleracao {
          background: color-mix(in srgb, var(--blue) 20%, transparent);
          border-color: color-mix(in srgb, var(--blue) 35%, transparent);
          color: var(--blue);
        }

        .tier-badge.tier-autogoverno {
          background: color-mix(in srgb, var(--purple) 20%, transparent);
          border-color: color-mix(in srgb, var(--purple) 35%, transparent);
          color: var(--purple);
        }

        h3 {
          margin: 0 0 4px;
          font-size: 18px;
          font-family: var(--font-display);
          font-weight: 700;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 14px;
          line-height: 1.4;
        }

        @media (max-width: 720px) {
          .content-thumb {
            width: 96px;
            min-width: 96px;
          }
        }
      `}</style>
    </>
  );

  if (locked || !item?.url) {
    return (
      <article className="content-card card locked">
        {cardBody}

        <style jsx>{`
        .content-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg2);
          opacity: 0.5;
          cursor: default;
        }
        `}</style>
      </article>
    );
  }

  const sharedStyles = (
    <style jsx>{`
      .content-card {
        display: flex;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--bg2);
        text-decoration: none;
        color: inherit;
      }

      :global(a.content-card),
      :global(button.content-card) {
        transition: var(--transition);
        cursor: pointer;
      }

      .content-card:hover {
        border-color: var(--green-mid);
      }
    `}</style>
  );

  if (internalHref) {
    return (
      <Link className="content-card card card-interactive" href={internalHref} onClick={onClick}>
        {cardBody}
        {sharedStyles}
      </Link>
    );
  }

  if (typeof onClick === 'function') {
    return (
      <button type="button" className="content-card card card-interactive as-button" onClick={onClick}>
        {cardBody}

        <style jsx>{`
          .content-card {
            display: flex;
            gap: 12px;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--bg2);
            text-decoration: none;
            color: inherit;
            transition: var(--transition);
          }

          .content-card:hover {
            border-color: var(--green-mid);
          }

          .as-button {
            width: 100%;
            text-align: left;
            cursor: pointer;
          }
        `}</style>
      </button>
    );
  }

  return (
    <article className="content-card card card-interactive">
      {cardBody}
      {sharedStyles}
    </article>
  );
}
