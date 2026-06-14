'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import EmailLogRow from '@/components/admin/email/EmailLogRow';
import EmailSnapshotModal from '@/components/admin/email/EmailSnapshotModal';

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

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

function metricNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function buildQuery(filters, page) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');

  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.emailType) params.set('email_type', filters.emailType);
  if (filters.status) params.set('status', filters.status);
  if (filters.month) params.set('month', filters.month);

  return params.toString();
}

export default function AdminEmailsPage() {
  const [filters, setFilters] = useState({
    search: '',
    emailType: '',
    status: '',
    period: 'month',
    month: currentMonthValue()
  });
  const [page, setPage] = useState(1);
  const [logsPayload, setLogsPayload] = useState({ logs: [], total: 0, pages: 1 });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState({ log: null, view: 'preview' });

  const activeMonth = filters.period === 'month' ? filters.month : '';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const query = buildQuery({ ...filters, month: activeMonth }, page);
      const statsQuery = activeMonth ? `?month=${encodeURIComponent(activeMonth)}` : '';
      const [logsResult, statsResult] = await Promise.all([
        requestJson(`/api/admin/email-logs?${query}`),
        requestJson(`/api/admin/email-logs/stats${statsQuery}`)
      ]);

      setLogsPayload(logsResult || { logs: [], total: 0, pages: 1 });
      setStats(statsResult || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar emails');
    } finally {
      setIsLoading(false);
    }
  }, [activeMonth, filters, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const metrics = useMemo(
    () => [
      { label: 'Total enviados', value: metricNumber(stats?.total_sent), icon: '✉️' },
      { label: 'Taxa de abertura', value: `${Number(stats?.open_rate || 0).toLocaleString('pt-BR')}%`, icon: '🟢' },
      { label: 'Clicaram', value: metricNumber(stats?.total_clicked), icon: '🔵' },
      { label: 'Bounces', value: metricNumber(stats?.bounced), icon: '🔴' }
    ],
    [stats]
  );

  return (
    <main className="emails-screen">
      <header className="page-header">
        <div>
          <Link href="/admin" className="back-link">
            ← voltar
          </Link>
          <h1>Gestão de Emails 📧</h1>
          <p>Logs de envio, rastreamento e pontos de contato</p>
        </div>
        <button type="button" className="refresh-btn" onClick={loadData}>
          Atualizar
        </button>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="metrics-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span>{metric.icon}</span>
            <div>
              <strong>{metric.value}</strong>
              <small>{metric.label}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="filters-card">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="Buscar por nome, email ou assunto"
        />
        <select value={filters.emailType} onChange={(event) => updateFilter('emailType', event.target.value)}>
          <option value="">Tipo: todos</option>
          <option value="monthly_report">Mensal</option>
          <option value="phase_milestone">Marco</option>
          <option value="reconnect">Reconexão</option>
          <option value="test">Teste</option>
        </select>
        <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
          <option value="">Status: todos</option>
          <option value="sent">Enviado</option>
          <option value="delivered">Entregue</option>
          <option value="opened">Aberto</option>
          <option value="clicked">Clicado</option>
          <option value="bounced">Bounce</option>
          <option value="failed">Falhou</option>
        </select>
        <select value={filters.period} onChange={(event) => updateFilter('period', event.target.value)}>
          <option value="month">Este mês</option>
          <option value="all">Tudo</option>
        </select>
        <input
          type="month"
          value={filters.month}
          onChange={(event) => updateFilter('month', event.target.value)}
          disabled={filters.period !== 'month'}
        />
      </section>

      <section className="logs-card">
        <div className="table-head">
          <h2>Logs de envio</h2>
          <span>{metricNumber(logsPayload.total)} registro(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Tipo</th>
                <th>Assunto</th>
                <th>Enviado em</th>
                <th>Status</th>
                <th>Abertura</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="state-cell">
                    Carregando emails...
                  </td>
                </tr>
              ) : logsPayload.logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="state-cell">
                    Nenhum email encontrado.
                  </td>
                </tr>
              ) : (
                logsPayload.logs.map((log) => (
                  <EmailLogRow
                    key={log.id}
                    log={log}
                    onPreview={(selected) => setModalState({ log: selected, view: 'preview' })}
                    onData={(selected) => setModalState({ log: selected, view: 'json' })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Anterior
          </button>
          <span>
            Página {page} de {logsPayload.pages || 1}
          </span>
          <button
            type="button"
            disabled={page >= Number(logsPayload.pages || 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
          </button>
        </div>
      </section>

      {modalState.log ? (
        <EmailSnapshotModal log={modalState.log} initialView={modalState.view} onClose={() => setModalState({ log: null, view: 'preview' })} />
      ) : null}

      <style jsx>{`
        .emails-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 24px;
        }

        .page-header {
          max-width: 1180px;
          margin: 0 auto 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .back-link {
          color: var(--green-dark);
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 8px;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 900;
        }

        .page-header p {
          margin-top: 6px;
          color: var(--text2);
        }

        .refresh-btn,
        .pagination button {
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
        .metrics-grid,
        .filters-card,
        .logs-card {
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
        }

        .error-box {
          border: 1px solid color-mix(in srgb, var(--red) 32%, transparent);
          border-radius: var(--radius-md);
          background: var(--red-dim);
          color: var(--red);
          padding: 12px 14px;
          margin-bottom: 14px;
          font-weight: 800;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .metric-card,
        .filters-card,
        .logs-card {
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
        }

        .metric-card > span {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-full);
          display: grid;
          place-items: center;
          background: var(--green-dim);
        }

        .metric-card strong {
          display: block;
          color: var(--green-dark);
          font-family: var(--font-mono);
          font-size: 22px;
          line-height: 1.1;
        }

        .metric-card small {
          color: var(--text3);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .filters-card {
          display: grid;
          grid-template-columns: minmax(260px, 1.6fr) repeat(4, minmax(140px, 1fr));
          gap: 10px;
          padding: 14px;
          margin-bottom: 14px;
        }

        input,
        select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text);
          min-height: 42px;
          padding: 9px 11px;
          font: inherit;
          font-size: 13px;
        }

        input:focus,
        select:focus {
          outline: 2px solid var(--green-dim);
          border-color: var(--green);
          background: var(--bg-card);
        }

        .logs-card {
          overflow: hidden;
        }

        .table-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          padding: 16px;
        }

        .table-head h2 {
          font-size: 18px;
        }

        .table-head span {
          color: var(--text3);
          font-size: 12px;
          font-weight: 800;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 980px;
          border-collapse: collapse;
        }

        th {
          background: var(--bg-section);
          color: var(--text3);
          padding: 10px 12px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.9px;
        }

        .state-cell {
          padding: 28px;
          text-align: center;
          color: var(--text2);
        }

        .pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          border-top: 1px solid var(--border);
          padding: 12px 16px;
        }

        .pagination button {
          background: var(--bg-input);
          color: var(--text2);
          border-color: var(--border);
          min-height: 36px;
          padding: 7px 12px;
          font-size: 12px;
        }

        .pagination button:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .pagination span {
          color: var(--text3);
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 980px) {
          .emails-screen {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
          }

          .metrics-grid,
          .filters-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
