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

  const palette = ['var(--green)', 'var(--gold)', 'var(--blue)', 'var(--purple)', 'var(--rose)', 'var(--diamond)'];
  return palette[Math.abs(hash) % palette.length];
}

function getEventTypeBadge(eventType) {
  const key = String(eventType || '').toLowerCase();

  if (key === 'month_complete') return { label: 'Mês completo', className: 'badge-green' };
  if (key === 'goal_reached') return { label: 'Meta atingida', className: 'badge-gold' };
  if (key === 'gain_registered') return { label: 'Novo ganho', className: 'badge-blue' };
  if (key === 'gain_grande') return { label: 'Ganho grande', className: 'badge-blue' };
  if (key === 'gratitude_registered') return { label: '🔥 Gratidão', className: 'badge-rose' };
  if (key.startsWith('gratitude_streak')) return { label: '🔥 Streak gratidão', className: 'badge-rose' };
  if (key === 'identity_registered') return { label: 'Identidade', className: 'badge-purple' };
  if (key === 'content_completed') return { label: 'Aula concluída', className: 'badge-green' };
  if (key === 'tier_upgrade') return { label: 'Tier upgrade', className: 'badge-purple' };
  if (key === 'workshop_redeemed') return { label: 'Workshop', className: 'badge-gold' };
  return { label: 'Evento', className: 'badge-neutral' };
}

export default function FeedEventCard({ event, onReact }) {
  const authorName = event?.author_name || 'Mentorado';
  const authorTier = event?.author_tier || 'DESPERTAR';
  const initial = authorName.trim().charAt(0).toUpperCase() || 'M';
  const avatarColor = avatarColorFromName(authorName);
  const typeBadge = getEventTypeBadge(event?.event_type);
  const reactionCount = Number(event?.reaction_count || 0);

  return (
    <article className="feed-card card">
      <div className="feed-card-top">
        <div className="feed-author-avatar avatar" style={{ background: avatarColor }} aria-hidden="true">
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

      <span className={`feed-event-type badge ${typeBadge.className}`}>{typeBadge.label}</span>
      <h3 className="feed-title">{event?.title || 'Evento da turma'}</h3>
      {event?.body ? <p className="feed-body">{event.body}</p> : null}

      <button
        type="button"
        className={`feed-react-btn badge badge-neutral ${event?.user_reacted ? 'active badge-green' : ''}`}
        onClick={() => onReact?.(event?.id)}
      >
        💪 Dar força <span className="reaction-count">({reactionCount})</span>
      </button>

      <style jsx>{`
        .feed-card {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg2);
          padding: 14px;
          box-shadow: var(--shadow-card);
        }

        .feed-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .feed-author-avatar {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: var(--bg);
          flex-shrink: 0;
          border: 1px solid var(--border-3);
          box-shadow: var(--shadow-sm);
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
          color: var(--text);
          font-weight: 700;
        }

        .feed-time {
          font-size: 11px;
          color: var(--muted);
        }

        .feed-event-type {
          margin-bottom: 8px;
          width: fit-content;
          font-family: var(--font-body);
        }

        .feed-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-family: var(--font-body);
          font-weight: 700;
          line-height: 1.15;
          color: var(--text);
        }

        .feed-body {
          margin: 0 0 12px;
          color: var(--text);
          font-size: 14px;
          line-height: 1.4;
        }

        .feed-react-btn {
          border-color: var(--border);
          background: var(--bg3);
          color: var(--text-2);
          font-size: 13px;
          font-weight: 700;
          padding: 8px 11px;
          cursor: pointer;
          transition: var(--transition);
        }

        .feed-react-btn:hover {
          border-color: var(--green-mid);
          color: var(--green);
        }

        .feed-react-btn.active {
          border-color: var(--green-mid);
          background: var(--green-dim);
          color: var(--green);
        }

        .reaction-count {
          font-family: var(--font-mono);
        }
      `}</style>
    </article>
  );
}
