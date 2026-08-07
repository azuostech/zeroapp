'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './admin-diagnostics.module.css';

const STATUS_LABELS = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  answers_completed: 'Respostas concluídas',
  generating_report: 'Gerando relatório',
  report_ready: 'Relatório pronto',
  generation_failed: 'Falha na geração'
};

function dateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(value));
}

function ReportModal({ diagnostic, loading, error, onClose }) {
  if (!diagnostic && !loading && !error) return null;
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Relatório do diagnóstico" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <span>RELATÓRIO PERSONALIZADO</span>
            <h2>{diagnostic?.profile?.full_name || diagnostic?.profile?.email || 'Carregando…'}</h2>
            {diagnostic?.profile?.email ? <p>{diagnostic.profile.email}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar relatório">×</button>
        </header>
        <div className={styles.modalBody}>
          {loading ? <div className={styles.loading}>Carregando relatório…</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          {!loading && !error && diagnostic?.report ? (
            <article className={styles.reportText}>{diagnostic.report}</article>
          ) : null}
          {!loading && !error && diagnostic && !diagnostic.report ? (
            <div className={styles.empty}>Este diagnóstico ainda não possui relatório gerado.</div>
          ) : null}
        </div>
        {diagnostic?.pdf_ready ? (
          <footer className={styles.modalFooter}>
            <a href={`/api/admin/diagnostics/${encodeURIComponent(diagnostic.id)}/pdf`} target="_blank" rel="noreferrer">
              Baixar relatório em PDF
            </a>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export default function AdminDiagnosticsPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const response = await fetch(`/api/admin/diagnostics?${params}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'diagnostics_load_failed');
      setPayload(data);
    } catch (_) {
      setError('Não foi possível carregar os diagnósticos.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  };

  const openReport = async (item) => {
    setDetail({ ...item, report: null });
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await fetch(`/api/admin/diagnostics/${encodeURIComponent(item.id)}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'diagnostic_detail_failed');
      setDetail(data.diagnostic);
    } catch (_) {
      setDetailError('Não foi possível abrir este relatório.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReport = () => {
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
  };

  const diagnostics = payload?.diagnostics || [];
  const metrics = payload?.metrics || {};

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/admin" className={styles.back}>← Painel administrativo</Link>
          <p className={styles.eyebrow}>ACOMPANHAMENTO DOS MENTORADOS</p>
          <h1>Relatórios do Diagnóstico</h1>
          <p>Consulte os diagnósticos, acompanhe a geração e abra os relatórios personalizados.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={() => load()} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      <section className={styles.metrics} aria-label="Resumo dos diagnósticos">
        <article><span>Total</span><strong>{metrics.total ?? '—'}</strong></article>
        <article className={styles.readyMetric}><span>Relatórios prontos</span><strong>{metrics.ready ?? '—'}</strong></article>
        <article><span>Em andamento</span><strong>{metrics.in_progress ?? '—'}</strong></article>
        <article className={styles.failedMetric}><span>Com falha</span><strong>{metrics.failed ?? '—'}</strong></article>
      </section>

      <section className={styles.toolbar}>
        <form onSubmit={submitSearch}>
          <input
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
          />
          <button type="submit">Buscar</button>
        </form>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div><strong>Mentorado</strong></div>
          <div><strong>Status</strong></div>
          <div><strong>Relatório</strong></div>
          <div><strong>Atualização</strong></div>
          <div><strong>Ações</strong></div>
        </div>
        {loading && !payload ? <div className={styles.loading}>Carregando diagnósticos…</div> : null}
        {!loading && diagnostics.length === 0 ? <div className={styles.empty}>Nenhum diagnóstico encontrado.</div> : null}
        {diagnostics.map((item) => (
          <article className={styles.row} key={item.id}>
            <div className={styles.person} data-label="Mentorado">
              <strong>{item.profile?.full_name || 'Sem nome'}</strong>
              <span>{item.profile?.email || '—'}</span>
              <small>Turma: {item.profile?.turma || '—'}</small>
            </div>
            <div data-label="Status">
              <span className={`${styles.status} ${styles[`status_${item.status}`] || ''}`}>
                {STATUS_LABELS[item.status] || item.status}
              </span>
            </div>
            <div className={styles.delivery} data-label="Relatório">
              <span>PDF: {item.pdf_status || '—'}</span>
              <span>E-mail: {item.email_status || '—'}</span>
            </div>
            <div data-label="Atualização">{dateTime(item.report_generated_at || item.updated_at)}</div>
            <div className={styles.actions} data-label="Ações">
              <button type="button" onClick={() => openReport(item)} disabled={item.status !== 'report_ready'}>
                Abrir relatório
              </button>
              {item.pdf_ready ? (
                <a href={`/api/admin/diagnostics/${encodeURIComponent(item.id)}/pdf`} target="_blank" rel="noreferrer">PDF</a>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.pagination}>
        <span>{payload?.total ?? 0} diagnóstico(s)</span>
        <div>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
          <span>Página {payload?.page || page} de {payload?.pages || 1}</span>
          <button type="button" disabled={page >= (payload?.pages || 1) || loading} onClick={() => setPage((current) => current + 1)}>Próxima</button>
        </div>
      </footer>

      <ReportModal diagnostic={detail} loading={detailLoading} error={detailError} onClose={closeReport} />
    </main>
  );
}
