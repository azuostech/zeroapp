'use client';

import { TierBadge } from '@/components/gamification/TierBadge';

function formatRelativeLabel(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Agora';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMs < 3600000) return 'Agora';
  if (diffHours < 24) return `ha ${diffHours}h`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - target) / 86400000);

  if (diffDays === 1) return 'Ontem';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

function avatarColorFromName(name) {
  const base = String(name || 'Mentorado');
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }

  const palette = ['#00c853', '#ff8a00', '#00acc1', '#7c4dff', '#f06292', '#43a047'];
  return palette[Math.abs(hash) % palette.length];
}

export default function FeedEventCard({ event, onReact }) {
  const authorName = event?.author_name || 'Mentorado';
  const authorTier = event?.author_tier || 'DESPERTAR';
  const initial = authorName.trim().charAt(0).toUpperCase() || 'M';
  const avatarColor = avatarColorFromName(authorName);

  return (
    <article className="feed-card">
      <div className="feed-card-top">
        <div className="feed-author-avatar" style={{ background: avatarColor }} aria-hidden="true">
          {initial}
        </div>

        <div className="feed-author-meta">
          <div className="feed-author-row">
            <strong>{authorName}</strong>
            <span className="feed-time">{formatRelativeLabel(event?.created_at)}</span>
          </div>
          <TierBadge tier={authorTier} size="sm" showName={false} />
        </div>
      </div>

      <h3 className="feed-title">{event?.title || 'Evento da turma'}</h3>
      {event?.body ? <p className="feed-body">{event.body}</p> : null}

      <button
        type="button"
        className={`feed-react-btn ${event?.user_reacted ? 'active' : ''}`}
        onClick={() => onReact?.(event?.id)}
      >
        💪 Dar forca ({Number(event?.reaction_count || 0)})
      </button>

      <style jsx>{`
        .feed-card {
          border: 1px solid var(--turma-border, #2f363d);
          border-radius: 14px;
          background: var(--turma-card, #141619);
          padding: 14px;
        }

        .feed-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .feed-author-avatar {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: #05120a;
          flex-shrink: 0;
        }

        .feed-author-meta {
          min-width: 0;
        }

        .feed-author-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 2px;
        }

        .feed-author-row strong {
          font-size: 14px;
        }

        .feed-time {
          font-size: 11px;
          color: var(--turma-muted, #98a0a8);
        }

        .feed-title {
          margin: 0 0 4px;
          font-size: 18px;
          line-height: 1.15;
        }

        .feed-body {
          margin: 0 0 12px;
          color: var(--turma-muted, #98a0a8);
          font-size: 14px;
          line-height: 1.4;
        }

        .feed-react-btn {
          border: 1px solid var(--turma-border, #2f363d);
          background: transparent;
          color: var(--turma-text, #f3f3f3);
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 12px;
          cursor: pointer;
        }

        .feed-react-btn.active {
          border-color: rgba(0, 200, 83, 0.45);
          background: rgba(0, 200, 83, 0.14);
          color: var(--turma-positive, #00c853);
        }
      `}</style>
    </article>
  );
}
