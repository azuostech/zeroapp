'use client';

import Link from 'next/link';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function diffLabel(startValue, endValue) {
  if (!startValue || !endValue) return '—';
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';

  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}min` : `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function getEmailStatusMeta(log) {
  const status = String(log?.status || '').toLowerCase();
  const opened = Boolean(log?.opened_at || Number(log?.open_count || 0) > 0);
  const clicked = Boolean(log?.clicked_at || Number(log?.click_count || 0) > 0);

  if (status === 'bounced') return { icon: '🔴', label: 'Bounce', className: 'status-red' };
  if (status === 'clicked' || clicked) return { icon: '🔵', label: 'Clicou', className: 'status-blue' };
  if (status === 'opened' || opened) return { icon: '🟢', label: 'Aberto', className: 'status-green' };
  if (status === 'sent' || status === 'delivered') return { icon: '🟡', label: status === 'delivered' ? 'Entregue' : 'Enviado', className: 'status-gold' };
  if (status === 'failed') return { icon: '🔴', label: 'Falhou', className: 'status-red' };
  return { icon: '⚪', label: 'Não aberto', className: 'status-muted' };
}

function typeLabel(type) {
  const labels = {
    monthly_report: 'Mensal',
    phase_milestone: 'Marco',
    reconnect: 'Reconexão',
    test: 'Teste'
  };
  return labels[type] || type || 'Email';
}

function displayName(log) {
  return log?.profile?.full_name || log?.recipient || 'Aluno';
}

function displayEmail(log) {
  return log?.profile?.email || log?.recipient || '—';
}

export default function EmailLogRow({ log, onPreview, onData }) {
  const meta = getEmailStatusMeta(log);
  const initial = displayName(log).trim().charAt(0).toUpperCase() || 'A';
  const hasSnapshot = Boolean(log?.email_snapshot);

  return (
    <tr className="email-log-row">
      <td>
        <div className="student-cell">
          <span className="avatar">{initial}</span>
          <div className="student-meta">
            {log?.user_id ? (
              <Link href={`/admin/emails/aluno/${encodeURIComponent(log.user_id)}`} className="student-name">
                {displayName(log)}
              </Link>
            ) : (
              <strong className="student-name">{displayName(log)}</strong>
            )}
            <span>{displayEmail(log)}</span>
            {log?.profile?.turma ? <small>Turma {log.profile.turma}</small> : null}
          </div>
        </div>
      </td>
      <td>
        <span className="type-badge">{typeLabel(log?.email_type)}</span>
      </td>
      <td>
        <div className="subject-cell" title={log?.subject || ''}>
          {log?.subject || '—'}
        </div>
      </td>
      <td>{formatDateTime(log?.created_at || log?.sent_at)}</td>
      <td>
        <span className={`status-pill ${meta.className}`}>
          <span>{meta.icon}</span>
          {meta.label}
        </span>
        {Number(log?.open_count || 0) > 1 ? <small className="count-hint">{log.open_count} aberturas</small> : null}
      </td>
      <td>{log?.opened_at ? diffLabel(log?.created_at || log?.sent_at, log.opened_at) : '—'}</td>
      <td>
        <div className="actions">
          <button type="button" onClick={() => onPreview?.(log)} disabled={!hasSnapshot}>
            Preview
          </button>
          <button type="button" onClick={() => onData?.(log)} disabled={!hasSnapshot}>
            Dados
          </button>
        </div>
      </td>

      <style jsx>{`
        .email-log-row {
          border-top: 1px solid var(--border);
        }

        td {
          padding: 13px 12px;
          vertical-align: middle;
          color: var(--text2);
          font-size: 13px;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 220px;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--green);
          color: var(--text-on-green);
          display: inline-grid;
          place-items: center;
          font-size: 13px;
          font-weight: 900;
          flex: 0 0 auto;
        }

        .student-meta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .student-name {
          color: var(--text);
          font-weight: 800;
          text-decoration: none;
        }

        .student-name:hover {
          color: var(--green-dark);
        }

        .student-meta span,
        .student-meta small {
          color: var(--text3);
          font-size: 11px;
        }

        .type-badge,
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .type-badge {
          background: var(--bg-input);
          color: var(--text2);
        }

        .status-green {
          border-color: var(--border-green);
          background: var(--green-dim);
          color: var(--green-dark);
        }

        .status-blue {
          border-color: color-mix(in srgb, var(--blue) 24%, transparent);
          background: var(--blue-dim);
          color: var(--blue);
        }

        .status-gold {
          border-color: var(--gold-mid);
          background: var(--gold-dim);
          color: var(--gold-dark);
        }

        .status-red {
          border-color: color-mix(in srgb, var(--red) 24%, transparent);
          background: var(--red-dim);
          color: var(--red);
        }

        .status-muted {
          background: var(--bg-input);
          color: var(--text3);
        }

        .count-hint {
          display: block;
          margin-top: 4px;
          color: var(--text3);
          font-size: 10px;
        }

        .subject-cell {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text);
          font-weight: 650;
        }

        .actions {
          display: flex;
          gap: 6px;
        }

        .actions button {
          border: 1px solid var(--border-green);
          border-radius: var(--radius-sm);
          background: var(--green-dim);
          color: var(--green-dark);
          min-height: 34px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .actions button:disabled {
          opacity: 0.45;
          cursor: default;
        }
      `}</style>
    </tr>
  );
}
