'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ContactTimeline from '@/components/admin/email/ContactTimeline';
import EmailSnapshotModal from '@/components/admin/email/EmailSnapshotModal';

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function requestJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await parseResponse(response);
  if (!response.ok) throw new Error(payload?.error || 'request_failed');
  return payload;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function AdminEmailStudentPage() {
  const params = useParams();
  const userId = String(params?.userId || '').trim();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError('');

    try {
      const payload = await requestJson(`/api/admin/email-logs?user_id=${encodeURIComponent(userId)}&limit=100`);
      setLogs(Array.isArray(payload?.logs) ? payload.logs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const summary = useMemo(() => {
    const total = logs.length;
    const opened = logs.filter((log) => log.opened_at || Number(log.open_count || 0) > 0 || ['opened', 'clicked'].includes(String(log.status))).length;
    const last = logs[0] || null;
    const profile = logs.find((log) => log.profile)?.profile || null;

    return {
      total,
      opened,
      openRate: total > 0 ? Math.round((opened / total) * 1000) / 10 : 0,
      last,
      profile
    };
  }, [logs]);

  const title = summary.profile?.full_name || summary.profile?.email || 'Histórico de Emails';

  return (
    <main className="student-email-screen">
      <header className="page-header">
        <div>
          <Link href="/admin/emails" className="back-link">
            ← voltar
          </Link>
          <h1>{title}</h1>
          <p>Histórico de Emails</p>
        </div>
        <button type="button" onClick={loadLogs}>
          Atualizar
        </button>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="summary-grid">
        <article>
          <strong>{summary.total}</strong>
          <span>Total recebidos</span>
        </article>
        <article>
          <strong>{summary.openRate}%</strong>
          <span>Taxa de abertura</span>
        </article>
        <article>
          <strong>{formatDate(summary.last?.created_at || summary.last?.sent_at)}</strong>
          <span>Último email</span>
        </article>
        <article>
          <strong>{summary.opened}</strong>
          <span>Emails abertos</span>
        </article>
      </section>

      <section className="timeline-wrap">
        {isLoading ? <div className="state">Carregando histórico...</div> : <ContactTimeline logs={logs} onPreview={setSelectedLog} />}
      </section>

      {selectedLog ? <EmailSnapshotModal log={selectedLog} initialView="preview" onClose={() => setSelectedLog(null)} /> : null}

      <style jsx>{`
        .student-email-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 24px;
        }

        .page-header,
        .summary-grid,
        .timeline-wrap,
        .error-box {
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }

        .back-link {
          color: var(--green-dark);
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        h1,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 8px;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 900;
        }

        .page-header p {
          margin-top: 5px;
          color: var(--text2);
        }

        .page-header button {
          border: 1px solid var(--border-green);
          border-radius: var(--radius-md);
          background: var(--green);
          color: var(--text-on-green);
          min-height: 42px;
          padding: 9px 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .error-box,
        .state {
          border: 1px solid color-mix(in srgb, var(--red) 32%, transparent);
          border-radius: var(--radius-md);
          background: var(--red-dim);
          color: var(--red);
          padding: 12px 14px;
          margin-bottom: 14px;
          font-weight: 800;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .summary-grid article {
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          padding: 16px;
        }

        .summary-grid strong {
          display: block;
          color: var(--green-dark);
          font-family: var(--font-mono);
          font-size: 21px;
          line-height: 1.1;
        }

        .summary-grid span {
          display: block;
          margin-top: 6px;
          color: var(--text3);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .state {
          border-color: var(--border);
          background: var(--bg-card);
          color: var(--text2);
          text-align: center;
        }

        @media (max-width: 820px) {
          .student-email-screen {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
