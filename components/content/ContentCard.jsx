'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';

const TIER_BADGES = {
  LIVRE: { label: 'Gratis', color: '#00c853', bg: 'rgba(0, 200, 83, 0.14)' },
  MOVIMENTO: { label: 'Mentorado', color: '#f4b400', bg: 'rgba(244, 180, 0, 0.16)' },
  ACELERACAO: { label: 'Aceleracao', color: '#42a5f5', bg: 'rgba(66, 165, 245, 0.16)' },
  AUTOGOVERNO: { label: 'Autogoverno', color: '#ab47bc', bg: 'rgba(171, 71, 188, 0.16)' }
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
          <span className="tier-badge" style={{ color: tier.color, background: tier.bg }}>
            {locked ? '🔒 Bloqueado' : tier.label}
          </span>
          <span className="type-badge">{type.label}</span>
        </div>

        <h3>{item?.title || 'Conteudo'}</h3>
        <p>{locked ? lockedDescription : item?.description || 'Conteudo da area do aluno.'}</p>
      </div>

      <style jsx>{`
        .content-thumb {
          width: 128px;
          min-width: 128px;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(0, 200, 83, 0.2), rgba(0, 200, 83, 0.08));
          border: 1px solid rgba(0, 200, 83, 0.24);
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
          border-radius: 11px;
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
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        .type-badge {
          border: 1px solid var(--conteudo-border, #2f363d);
          color: var(--conteudo-muted, #8e98a2);
        }

        h3 {
          margin: 0 0 4px;
          font-size: 18px;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: var(--conteudo-muted, #8e98a2);
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
      <article className="content-card locked">
        {cardBody}

        <style jsx>{`
          .content-card {
            display: flex;
            gap: 12px;
            border: 1px solid var(--conteudo-border, #2f363d);
            border-radius: 14px;
            background: var(--conteudo-card, #141619);
            padding: 12px;
            opacity: 0.58;
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
        border: 1px solid var(--conteudo-border, #2f363d);
        border-radius: 14px;
        background: var(--conteudo-card, #141619);
        padding: 12px;
        text-decoration: none;
        color: inherit;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }

      .content-card:hover {
        transform: translateY(-1px);
        border-color: rgba(0, 200, 83, 0.45);
      }
    `}</style>
  );

  if (internalHref) {
    return (
      <Link className="content-card" href={internalHref} onClick={onClick}>
        {cardBody}
        {sharedStyles}
      </Link>
    );
  }

  if (typeof onClick === 'function') {
    return (
      <button type="button" className="content-card as-button" onClick={onClick}>
        {cardBody}

        <style jsx>{`
          .content-card {
            display: flex;
            gap: 12px;
            border: 1px solid var(--conteudo-border, #2f363d);
            border-radius: 14px;
            background: var(--conteudo-card, #141619);
            padding: 12px;
            text-decoration: none;
            color: inherit;
            transition: transform 0.15s ease, border-color 0.15s ease;
          }

          .content-card:hover {
            transform: translateY(-1px);
            border-color: rgba(0, 200, 83, 0.45);
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
    <article className="content-card">
      {cardBody}
      {sharedStyles}
    </article>
  );
}
