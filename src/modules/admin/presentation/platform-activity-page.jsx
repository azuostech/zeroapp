'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './platform-activity.module.css';

const CATEGORY_LABELS = {
  all: 'Todas',
  user: 'Cadastros',
  auth: 'Acesso',
  commerce: 'Compras',
  diagnostic: 'Diagnóstico',
  email: 'E-mails',
  admin: 'Admin',
  system: 'Sistema'
};

const SEVERITY_LABELS = {
  info: 'Informação',
  success: 'Sucesso',
  warning: 'Atenção',
  error: 'Erro'
};

function dateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(value));
}

function EventCard({ item, onResolve, resolving }) {
  const canResolve = item.id.startsWith('platform:') && item.status === 'open';
  return (
    <article className={`${styles.eventCard} ${styles[item.severity] || ''}`}>
      <div className={styles.eventMarker} aria-hidden="true" />
      <div className={styles.eventBody}>
        <div className={styles.eventTopline}>
          <span className={styles.category}>{CATEGORY_LABELS[item.category] || item.category}</span>
          <span className={`${styles.severity} ${styles[`severity_${item.severity}`]}`}>
            {SEVERITY_LABELS[item.severity] || item.severity}
          </span>
          <time>{dateTime(item.occurred_at)}</time>
        </div>
        <strong>{item.title}</strong>
        {item.detail ? <p>{item.detail}</p> : null}
        <div className={styles.eventFooter}>
          {item.profile?.email ? <span>{item.profile.email}</span> : <span>{item.type}</span>}
          <div>
            {item.href ? <Link href={item.href}>Abrir contexto</Link> : null}
            {canResolve ? (
              <button type="button" disabled={resolving} onClick={() => onResolve(item)}>
                {resolving ? 'Salvando…' : 'Marcar resolvido'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PlatformActivityPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');
  const [resolving, setResolving] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/activity?days=${days}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'activity_load_failed');
      setPayload(data);
    } catch (_) {
      setError('Não foi possível carregar a atividade da plataforma.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const matches = useCallback((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (severity !== 'all' && item.severity !== severity) return false;
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    if (!needle) return true;
    return [item.title, item.detail, item.type, item.profile?.email, item.profile?.full_name]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(needle));
  }, [category, query, severity]);

  const attention = useMemo(() => (payload?.attention || []).filter(matches), [matches, payload?.attention]);
  const events = useMemo(() => (payload?.events || []).filter(matches), [matches, payload?.events]);

  const resolveEvent = async (item) => {
    const id = item.id.replace(/^platform:/, '');
    setResolving(item.id);
    try {
      const response = await fetch(`/api/admin/activity/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      if (!response.ok) throw new Error('activity_update_failed');
      await load({ silent: true });
    } catch (_) {
      setError('Não foi possível atualizar o evento.');
    } finally {
      setResolving('');
    }
  };

  const metrics = payload?.metrics || {};

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/admin" className={styles.back}>← Painel administrativo</Link>
          <p className={styles.eyebrow}>OPERAÇÃO DO ZEROAPP</p>
          <h1>Central de atividade</h1>
          <p>Cadastros, compras, erros, entregas e fluxos que precisam de acompanhamento.</p>
        </div>
        <div className={styles.headerActions}>
          <label>
            Período
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={1}>24 horas</option>
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </label>
          <button type="button" onClick={() => load()} disabled={loading}>Atualizar</button>
        </div>
      </header>

      {payload?.setup_required ? (
        <div className={styles.setupWarning} role="alert">
          Execute <code>scripts/migrate-platform-events.sql</code> para ativar também os eventos persistentes da aplicação.
        </div>
      ) : null}

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <section className={styles.metrics} aria-label="Indicadores do período">
        <article><span>Novos cadastros</span><strong>{metrics.new_users ?? '—'}</strong></article>
        <article><span>Compras ativas</span><strong>{metrics.purchases ?? '—'}</strong></article>
        <article><span>Relatórios prontos</span><strong>{metrics.diagnostics_ready ?? '—'}</strong></article>
        <article><span>Movimentações</span><strong>{metrics.platform_movements ?? '—'}</strong></article>
        <article className={styles.metricWarning}><span>Precisam de atenção</span><strong>{metrics.open_attention ?? '—'}</strong></article>
        <article className={styles.metricError}><span>Erros críticos</span><strong>{metrics.critical_errors ?? '—'}</strong></article>
      </section>

      <section className={styles.filters} aria-label="Filtros de atividade">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário, evento ou erro" />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="all">Todas as severidades</option>
          {Object.entries(SEVERITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      {loading && !payload ? <div className={styles.loading}>Carregando atividade…</div> : (
        <div className={styles.columns}>
          <section>
            <div className={styles.sectionTitle}>
              <div><p>FILA OPERACIONAL</p><h2>Precisa de atenção</h2></div>
              <span>{attention.length}</span>
            </div>
            <div className={styles.eventList}>
              {attention.length ? attention.map((item) => (
                <EventCard key={item.id} item={item} onResolve={resolveEvent} resolving={resolving === item.id} />
              )) : <div className={styles.empty}>Nenhuma pendência com estes filtros.</div>}
            </div>
          </section>

          <section>
            <div className={styles.sectionTitle}>
              <div><p>LINHA DO TEMPO</p><h2>Movimentações recentes</h2></div>
              <span>{events.length}</span>
            </div>
            <div className={styles.eventList}>
              {events.length ? events.map((item) => (
                <EventCard key={item.id} item={item} onResolve={resolveEvent} resolving={resolving === item.id} />
              )) : <div className={styles.empty}>Nenhuma movimentação com estes filtros.</div>}
            </div>
          </section>
        </div>
      )}

      {payload?.generated_at ? <footer>Atualizado em {dateTime(payload.generated_at)} · atualização automática a cada 60 segundos</footer> : null}
    </main>
  );
}
