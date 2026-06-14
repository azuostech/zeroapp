'use client';

import { getEmailStatusMeta } from './EmailLogRow';

function formatMonth(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function reactionLabel(log) {
  if (!log?.opened_at) return 'Não abriu';
  const start = new Date(log.created_at || log.sent_at);
  const opened = new Date(log.opened_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(opened.getTime())) return 'Abriu';

  const minutes = Math.max(0, Math.round((opened.getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `Abriu após ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `Abriu após ${hours}h ${rest}min` : `Abriu após ${hours}h`;
  return `Abriu após ${Math.floor(hours / 24)} dia(s)`;
}

function groupByMonth(logs) {
  return (logs || []).reduce((acc, log) => {
    const key = formatMonth(log.created_at || log.sent_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});
}

export default function ContactTimeline({ logs = [], onPreview }) {
  const groups = groupByMonth(logs);

  if (!logs.length) {
    return <div className="timeline-empty">Nenhum email encontrado para este aluno.</div>;
  }

  return (
    <div className="timeline">
      {Object.entries(groups).map(([month, items]) => (
        <section key={month} className="month-group">
          <h2>{month}</h2>
          <div className="events">
            {items.map((log) => {
              const meta = getEmailStatusMeta(log);
              return (
                <article key={log.id} className="event-card">
                  <div className="event-dot">{meta.icon}</div>
                  <div className="event-body">
                    <div className="event-top">
                      <strong>{log.subject || 'Email'}</strong>
                      <span>{formatDateTime(log.created_at || log.sent_at)}</span>
                    </div>
                    <div className="event-meta">
                      <span>{log.email_type}</span>
                      <span>{meta.label}</span>
                      <span>{reactionLabel(log)}</span>
                    </div>
                    <button type="button" onClick={() => onPreview?.(log)} disabled={!log.email_snapshot}>
                      Ver dados enviados
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <style jsx>{`
        .timeline {
          display: grid;
          gap: 18px;
        }

        .timeline-empty {
          border: 1px dashed var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          color: var(--text2);
          padding: 24px;
          text-align: center;
        }

        .month-group {
          display: grid;
          gap: 10px;
        }

        h2 {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .events {
          display: grid;
          gap: 10px;
        }

        .event-card {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          padding: 14px;
        }

        .event-dot {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--bg-input);
          display: grid;
          place-items: center;
        }

        .event-body {
          min-width: 0;
        }

        .event-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .event-top strong {
          color: var(--text);
          font-size: 14px;
        }

        .event-top span,
        .event-meta {
          color: var(--text3);
          font-size: 12px;
        }

        .event-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 6px;
        }

        .event-meta span {
          border-radius: var(--radius-full);
          background: var(--bg-input);
          padding: 3px 8px;
          font-weight: 800;
        }

        button {
          margin-top: 10px;
          border: 1px solid var(--border-green);
          border-radius: var(--radius-sm);
          background: var(--green-dim);
          color: var(--green-dark);
          min-height: 34px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.5;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
