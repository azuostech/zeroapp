'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';

const MONTH_LABELS = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez'
};

const BLOCK_ICONS = {
  receitas: '💰',
  'pagar-primeiro': '🛟',
  doar: '🤝',
  contas: '📄',
  investimentos: '📈',
  desfrute: '✨'
};

const ACTION_ERROR_MESSAGES = {
  annual_export_failed: 'Não foi possível gerar o arquivo. Tente novamente.',
  annual_email_failed: 'Não foi possível enviar o resumo anual. Tente novamente.',
  recipient_email_missing: 'Este cliente não possui e-mail cadastrado.',
  resend_not_configured: 'O serviço de e-mail ainda não está configurado.',
  unauthorized: 'Sua sessão expirou. Entre novamente para continuar.',
  forbidden: 'Você não tem permissão para executar esta ação.'
};

function actionErrorMessage(error, fallback) {
  return ACTION_ERROR_MESSAGES[String(error || '')] || fallback;
}

function currentYear() {
  return new Date().getFullYear();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCompactMoney(value) {
  const numeric = Number(value || 0);
  if (numeric === 0) return '—';

  const absolute = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';
  if (absolute >= 1000000) {
    return `${sign}R$ ${(absolute / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (absolute >= 1000) {
    return `${sign}R$ ${(absolute / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return `${sign}R$ ${absolute.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

function formatPercentage(value) {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function AmountCell({ value, className = '' }) {
  return (
    <td className={className} title={formatMoney(value)}>
      {formatCompactMoney(value)}
    </td>
  );
}

function SummaryCard({ icon, label, value, tone = 'neutral' }) {
  return (
    <article className={`annual-kpi ${tone}`}>
      <span className="annual-kpi-icon" aria-hidden="true">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{formatMoney(value)}</strong>
      </div>
    </article>
  );
}

export default function ResumoPage() {
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [recipient, setRecipient] = useState({ name: '', email: '' });
  const [expandedBlocks, setExpandedBlocks] = useState(() => new Set());
  const [isIAOpen, setIsIAOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState('');
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [queryContext, setQueryContext] = useState({ ready: false, userId: '' });
  const summaryCache = useRef(new Map());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQueryContext({ ready: true, userId: params.get('user_id') || '' });
  }, []);

  useEffect(() => {
    if (!queryContext.ready) return undefined;

    let mounted = true;
    const cacheKey = `${queryContext.userId || 'self'}:${year}`;
    const cached = summaryCache.current.get(cacheKey);

    if (cached) {
      setSummary(cached.summary);
      setRecipient(cached.recipient);
      setError('');
      setLoading(false);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ year: String(year) });
        if (queryContext.userId) params.set('user_id', queryContext.userId);

        const response = await fetch(`/api/finance/year?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Não foi possível carregar o resumo anual.');
        }

        if (!mounted) return;
        const nextSummary = payload?.summary || null;
        const nextRecipient = payload?.recipient || { name: '', email: '' };
        summaryCache.current.set(cacheKey, { summary: nextSummary, recipient: nextRecipient });
        setSummary(nextSummary);
        setRecipient(nextRecipient);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Erro ao carregar resumo anual.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [queryContext, year]);

  useEffect(() => {
    setExpandedBlocks(new Set());
    setActionFeedback(null);
  }, [year]);

  const backHref = queryContext.userId
    ? `/admin/users/${encodeURIComponent(queryContext.userId)}/dashboard`
    : '/app';

  const months = summary?.months || Object.keys(MONTH_LABELS);
  const blocks = summary?.blocks || [];
  const totals = summary?.totals || {};

  const annualRows = useMemo(() => [
    {
      key: 'total-expenses',
      label: 'Total de saídas',
      icon: '🧮',
      monthly: totals.expenseMonthly || {},
      total: totals.expenses || 0,
      revenuePercentage: totals.expensePercentage || 0,
      className: 'expenses-row'
    },
    {
      key: 'balance',
      label: 'Saldo',
      icon: '💵',
      monthly: totals.balanceMonthly || {},
      total: totals.balance || 0,
      revenuePercentage: totals.balancePercentage || 0,
      className: 'balance-row'
    }
  ], [totals]);

  const toggleBlock = (blockKey) => {
    setExpandedBlocks((current) => {
      const next = new Set(current);
      if (next.has(blockKey)) next.delete(blockKey);
      else next.add(blockKey);
      return next;
    });
  };

  const downloadExport = async (format) => {
    if (!summary || exportingFormat) return;
    setExportingFormat(format);
    setActionFeedback(null);

    try {
      const params = new URLSearchParams({ year: String(year), format });
      if (queryContext.userId) params.set('user_id', queryContext.userId);
      const response = await fetch(`/api/finance/year/export?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(actionErrorMessage(payload?.error, `Não foi possível exportar o arquivo ${format.toUpperCase()}.`));
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `resumo-financeiro-${year}.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setActionFeedback({ type: 'success', message: `${format.toUpperCase()} gerado com sucesso.` });
    } catch (err) {
      setActionFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Falha ao exportar arquivo.' });
    } finally {
      setExportingFormat('');
    }
  };

  const sendAnnualEmail = async () => {
    if (!summary || emailSending || !recipient.email) return;
    setEmailSending(true);
    setActionFeedback(null);

    try {
      const response = await fetch('/api/finance/year/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: String(year), ...(queryContext.userId ? { user_id: queryContext.userId } : {}) })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(actionErrorMessage(payload?.error, 'Não foi possível enviar o resumo anual.'));
      setEmailConfirmOpen(false);
      setActionFeedback({ type: 'success', message: `Resumo enviado para ${payload.recipient || recipient.email}.` });
    } catch (err) {
      setActionFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Falha ao enviar o resumo anual.' });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <main className="annual-shell">
      <header className="annual-header">
        <div>
          <h1>Resumo Financeiro Anual</h1>
          <p>Comparativo mês a mês — somente valores realizados</p>
        </div>
        <Link href={backHref} className="back-link">Voltar ao app</Link>
      </header>

      <nav className="year-nav" aria-label="Selecionar ano">
        <button type="button" onClick={() => setYear((current) => current - 1)} aria-label="Ano anterior">◀</button>
        <strong>{year}</strong>
        <button type="button" onClick={() => setYear((current) => current + 1)} aria-label="Próximo ano">▶</button>
      </nav>

      <section className="export-actions" aria-label="Exportar e compartilhar resumo anual">
        <button type="button" onClick={() => downloadExport('xlsx')} disabled={loading || !summary || Boolean(exportingFormat)}>
          <span aria-hidden="true">▦</span>
          {exportingFormat === 'xlsx' ? 'Gerando Excel...' : 'Exportar Excel'}
        </button>
        <button type="button" onClick={() => downloadExport('pdf')} disabled={loading || !summary || Boolean(exportingFormat)}>
          <span aria-hidden="true">↓</span>
          {exportingFormat === 'pdf' ? 'Gerando PDF...' : 'Exportar PDF'}
        </button>
        <button type="button" className="email-action" onClick={() => setEmailConfirmOpen(true)} disabled={loading || !summary || !recipient.email || emailSending} title={!recipient.email ? 'Este cliente não possui e-mail cadastrado.' : ''}>
          <span aria-hidden="true">✉</span>
          Enviar por e-mail
        </button>
      </section>

      {actionFeedback ? <div className={`action-feedback ${actionFeedback.type}`} role="status">{actionFeedback.message}</div> : null}

      {loading ? <div className="feedback">Carregando dados realizados de {year}...</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      {!loading && !error && summary ? (
        <>
          <section className="annual-kpis" aria-label="Indicadores anuais">
            <SummaryCard icon="💰" label="Receita realizada no ano" value={totals.revenue} tone="positive" />
            <SummaryCard icon="💳" label="Saídas realizadas no ano" value={totals.expenses} />
            <SummaryCard icon="📊" label="Saldo realizado no ano" value={totals.balance} tone={totals.balance >= 0 ? 'positive' : 'negative'} />
          </section>

          <section className="annual-table-card">
            <div className="table-heading">
              <div>
                <h2>Realizado por bloco</h2>
                <p>Selecione um bloco para consultar os lançamentos declarados</p>
              </div>
              <span className="realized-only">Somente realizados</span>
            </div>

            <div className="table-hint">
              <span aria-hidden="true">›</span>
              Os blocos iniciam recolhidos. Abra somente o que deseja analisar.
            </div>

            <div className="annual-table-scroll">
              <table className="annual-table">
                <thead>
                  <tr>
                    <th className="block-column">Bloco</th>
                    {months.map((month) => <th key={month}>{MONTH_LABELS[month]}</th>)}
                    <th className="annual-total-column">Total anual</th>
                    <th className="annual-percentage-column">% da receita</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => {
                    const expanded = expandedBlocks.has(block.key);
                    const detailId = `annual-detail-${block.key}`;
                    return (
                      <Fragment key={block.key}>
                        <tr className={`block-row ${expanded ? 'expanded' : ''} ${block.key === 'receitas' ? 'revenue-row' : ''}`}>
                          <th className="block-column" scope="row">
                            <button
                              type="button"
                              className="block-toggle"
                              onClick={() => toggleBlock(block.key)}
                              aria-expanded={expanded}
                              aria-controls={detailId}
                            >
                              <span className="chevron" aria-hidden="true">{expanded ? '⌄' : '›'}</span>
                              <span className="block-icon" aria-hidden="true">{BLOCK_ICONS[block.key]}</span>
                              <span className="block-label-wrap">
                                <strong>{block.label}</strong>
                                <small>{block.entries.length} {block.entries.length === 1 ? 'lançamento realizado' : 'lançamentos realizados'}</small>
                              </span>
                            </button>
                          </th>
                          {months.map((month) => <AmountCell key={month} value={block.monthly?.[month]} />)}
                          <AmountCell value={block.total} className="annual-total-column" />
                          <td className="annual-percentage-column">{formatPercentage(block.revenuePercentage)}</td>
                        </tr>

                        {expanded ? (
                          <tr className="details-row" id={detailId}>
                            <td colSpan={months.length + 3}>
                              <div className="details-panel">
                                <div className="details-heading">
                                  <strong>Lançamentos de {block.label}</strong>
                                  <button type="button" onClick={() => toggleBlock(block.key)}>Recolher ⌃</button>
                                </div>

                                {block.entries.length > 0 ? (
                                  <table className="details-table">
                                    <thead>
                                      <tr>
                                        <th className="detail-name-column">Descrição</th>
                                        {months.map((month) => <th key={month}>{MONTH_LABELS[month]}</th>)}
                                        <th className="annual-total-column">Total anual</th>
                                        <th className="annual-percentage-column">% da receita</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {block.entries.map((entry) => (
                                        <tr key={entry.key}>
                                          <th className="detail-name-column" scope="row">
                                            {entry.groupLabel ? <small>{entry.groupLabel}</small> : null}
                                            <span>{entry.label}</span>
                                          </th>
                                          {months.map((month) => <AmountCell key={month} value={entry.monthly?.[month]} />)}
                                          <AmountCell value={entry.total} className="annual-total-column" />
                                          <td className="annual-percentage-column">{formatPercentage(entry.revenuePercentage)}</td>
                                        </tr>
                                      ))}
                                      <tr className="details-subtotal">
                                        <th className="detail-name-column" scope="row">Subtotal de {block.label}</th>
                                        {months.map((month) => <AmountCell key={month} value={block.monthly?.[month]} />)}
                                        <AmountCell value={block.total} className="annual-total-column" />
                                        <td className="annual-percentage-column">{formatPercentage(block.revenuePercentage)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="empty-details">Nenhum lançamento realizado neste ano.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}

                  {annualRows.map((row) => (
                    <tr key={row.key} className={row.className}>
                      <th className="block-column" scope="row">
                        <span className="summary-row-label"><span aria-hidden="true">{row.icon}</span>{row.label}</span>
                      </th>
                      {months.map((month) => <AmountCell key={month} value={row.monthly?.[month]} />)}
                      <AmountCell value={row.total} className="annual-total-column" />
                      <td className="annual-percentage-column">{formatPercentage(row.revenuePercentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="table-footnote"><span aria-hidden="true">ⓘ</span> Percentuais calculados sobre a receita realizada do período.</p>
          </section>
        </>
      ) : null}

      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />

      {emailConfirmOpen ? (
        <div className="email-dialog-backdrop" role="presentation" onMouseDown={() => !emailSending && setEmailConfirmOpen(false)}>
          <section className="email-dialog" role="dialog" aria-modal="true" aria-labelledby="email-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="email-dialog-close" onClick={() => setEmailConfirmOpen(false)} disabled={emailSending} aria-label="Fechar">×</button>
            <span className="email-dialog-icon" aria-hidden="true">✉</span>
            <h2 id="email-dialog-title">Enviar resumo anual?</h2>
            <p>O resumo de <strong>{year}</strong> será enviado para o e-mail cadastrado:</p>
            <strong className="email-recipient">{recipient.name ? `${recipient.name} · ` : ''}{recipient.email}</strong>
            <p className="email-dialog-note">O envio inclui o relatório completo em PDF e Excel.</p>
            <div className="email-dialog-actions">
              <button type="button" className="cancel" onClick={() => setEmailConfirmOpen(false)} disabled={emailSending}>Cancelar</button>
              <button type="button" className="confirm" onClick={sendAnnualEmail} disabled={emailSending}>{emailSending ? 'Enviando...' : 'Confirmar envio'}</button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        .annual-shell {
          max-width: 1540px;
          margin: 0 auto;
          min-height: 100vh;
          padding: 32px 24px 120px;
          color: var(--text);
          background: var(--bg);
        }

        .annual-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .annual-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(30px, 3vw, 44px);
          line-height: 1.05;
        }

        .annual-header p,
        .table-heading p {
          margin: 8px 0 0;
          color: var(--text-2);
        }

        .back-link {
          color: var(--text);
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }

        .year-nav {
          width: fit-content;
          margin: 26px auto 22px;
          display: inline-flex;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          align-items: center;
          border: 1px solid var(--border-2);
          border-radius: 999px;
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .year-nav button {
          width: 48px;
          height: 48px;
          border: 0;
          background: transparent;
          color: var(--text);
          cursor: pointer;
        }

        .year-nav button:hover { background: var(--bg-surface); }

        .year-nav strong {
          min-width: 92px;
          text-align: center;
          font-size: 18px;
        }

        .export-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin: -4px 0 24px;
        }

        .export-actions button {
          min-height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          border: 1px solid var(--border-2);
          border-radius: 12px;
          background: var(--bg-card);
          color: var(--text);
          font-weight: 700;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        .export-actions button:hover:not(:disabled) {
          border-color: var(--border-green);
          background: var(--green-dim);
        }

        .export-actions button.email-action {
          color: var(--green-text);
          border-color: var(--border-green);
          background: var(--green-dim);
        }

        .export-actions button:disabled { opacity: 0.55; cursor: not-allowed; }

        .action-feedback {
          margin: -10px 0 20px;
          padding: 11px 14px;
          border-radius: 12px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
        }

        .action-feedback.success { color: var(--green-text); background: var(--green-dim); border: 1px solid var(--border-green); }
        .action-feedback.error { color: var(--red); background: var(--red-dim); border: 1px solid var(--red); }

        .email-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(10, 20, 14, 0.55);
          backdrop-filter: blur(4px);
        }

        .email-dialog {
          width: min(460px, 100%);
          position: relative;
          padding: 30px;
          border: 1px solid var(--border-2);
          border-radius: 22px;
          background: var(--bg-card);
          box-shadow: var(--shadow-lg);
          text-align: center;
        }

        .email-dialog-close {
          position: absolute;
          top: 12px;
          right: 14px;
          border: 0;
          background: transparent;
          color: var(--text-2);
          font-size: 25px;
          cursor: pointer;
        }

        .email-dialog-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          border: 1px solid var(--border-green);
          border-radius: 50%;
          background: var(--green-dim);
          color: var(--green-text);
          font-size: 23px;
        }

        .email-dialog h2 { margin: 0; font-family: var(--font-display); font-size: 25px; }
        .email-dialog p { color: var(--text-2); line-height: 1.5; }
        .email-recipient { display: block; overflow-wrap: anywhere; color: var(--green-text); }
        .email-dialog .email-dialog-note { font-size: 12px; color: var(--text-3); }

        .email-dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 24px; }
        .email-dialog-actions button { min-height: 44px; border-radius: 11px; font-weight: 700; cursor: pointer; }
        .email-dialog-actions .cancel { border: 1px solid var(--border-2); background: var(--bg-card); color: var(--text); }
        .email-dialog-actions .confirm { border: 1px solid var(--green); background: var(--green); color: #fff; }
        .email-dialog-actions button:disabled { opacity: 0.6; cursor: wait; }

        .feedback {
          margin-bottom: 20px;
          padding: 16px;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
        }

        .feedback.error {
          color: var(--red);
          border-color: var(--red);
          background: var(--red-dim);
        }

        .annual-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .annual-kpi {
          min-height: 122px;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 20px 24px;
          border: 1px solid var(--border-2);
          border-radius: 22px;
          background: var(--bg-card);
          box-shadow: var(--shadow-card);
        }

        .annual-kpi.positive {
          border-color: var(--border-green);
          background: linear-gradient(135deg, var(--green-dim), var(--bg-card));
        }

        .annual-kpi.negative { border-color: var(--red); }

        .annual-kpi-icon {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: color-mix(in srgb, var(--bg-card) 82%, transparent);
          border: 1px solid var(--border-2);
          font-size: 26px;
        }

        .annual-kpi span:not(.annual-kpi-icon) {
          color: var(--text-2);
          font-size: 14px;
        }

        .annual-kpi strong {
          display: block;
          margin-top: 6px;
          font-family: var(--font-mono);
          font-size: clamp(21px, 2vw, 30px);
          line-height: 1.1;
        }

        .annual-kpi.positive strong { color: var(--green-text); }
        .annual-kpi.negative strong { color: var(--red); }

        .annual-table-card {
          border: 1px solid var(--border-2);
          border-radius: 24px;
          background: var(--bg-card);
          box-shadow: var(--shadow-card);
          padding: 22px 18px 16px;
        }

        .table-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 0 8px;
        }

        .table-heading h2 {
          margin: 0;
          font-family: var(--font-display);
          font-size: 24px;
        }

        .realized-only {
          padding: 7px 11px;
          border-radius: 999px;
          color: var(--green-text);
          background: var(--green-dim);
          border: 1px solid var(--border-green);
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .table-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 22px 8px 12px;
          color: var(--text-2);
          font-size: 13px;
        }

        .table-hint span {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border-green);
          border-radius: 50%;
          color: var(--green-text);
          font-weight: 800;
        }

        .annual-table-scroll {
          overflow-x: auto;
          border: 1px solid var(--border-2);
          border-radius: 16px;
          scrollbar-color: var(--green-mid) transparent;
        }

        .annual-table,
        .details-table {
          width: 100%;
          min-width: 1420px;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
          font-size: 12px;
        }

        .annual-table th,
        .annual-table td,
        .details-table th,
        .details-table td {
          height: 58px;
          padding: 9px 8px;
          border-bottom: 1px solid var(--border-2);
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .annual-table thead th,
        .details-table thead th {
          height: 50px;
          color: var(--text-2);
          background: var(--bg-card);
          font-weight: 700;
        }

        .annual-table tbody tr:last-child > *,
        .details-table tbody tr:last-child > * { border-bottom: 0; }

        .annual-table th:not(.block-column),
        .annual-table td:not(.block-column),
        .details-table th:not(.detail-name-column),
        .details-table td:not(.detail-name-column) { width: 82px; }

        .block-column {
          width: 220px;
          min-width: 220px;
          position: sticky;
          left: 0;
          z-index: 2;
          text-align: left !important;
          background: var(--bg-card);
          border-right: 1px solid var(--border-2);
        }

        thead .block-column { z-index: 4; }

        .annual-total-column {
          width: 112px !important;
          background: color-mix(in srgb, var(--green-dim) 48%, var(--bg-card));
          border-left: 1px solid var(--border-green);
          font-weight: 800;
        }

        .annual-percentage-column {
          width: 98px !important;
          background: color-mix(in srgb, var(--green-dim) 48%, var(--bg-card));
          font-weight: 800;
        }

        .block-toggle {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--text);
          text-align: left;
          cursor: pointer;
        }

        .chevron {
          width: 18px;
          color: var(--green-text);
          font-size: 22px;
          line-height: 1;
        }

        .block-icon { font-size: 19px; }

        .block-label-wrap {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .block-label-wrap strong { font-size: 13px; }
        .block-label-wrap small { margin-top: 3px; color: var(--text-3); font-size: 9px; }

        .block-row:hover > *,
        .block-row.expanded > * { background-color: color-mix(in srgb, var(--green-dim) 65%, var(--bg-card)); }

        .revenue-row > *,
        .balance-row > * { color: var(--green-text); }

        .revenue-row > *,
        .balance-row > *,
        .balance-row .block-column { background-color: color-mix(in srgb, var(--green-dim) 72%, var(--bg-card)); }

        .expenses-row > *,
        .expenses-row .block-column { background-color: var(--bg-surface); font-weight: 800; }

        .summary-row-label {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 25px;
          font-weight: 800;
        }

        .details-row > td {
          height: auto;
          padding: 0;
          background: var(--bg-surface);
          text-align: left;
        }

        .details-panel {
          margin: 10px;
          padding: 14px 10px 10px;
          border: 1px solid var(--border-2);
          border-radius: 14px;
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
        }

        .details-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px 12px;
        }

        .details-heading button {
          border: 0;
          background: transparent;
          color: var(--green-text);
          font-weight: 700;
          cursor: pointer;
        }

        .details-table {
          min-width: 1340px;
          border: 1px solid var(--border-2);
          border-radius: 10px;
          overflow: hidden;
        }

        .details-table th,
        .details-table td { height: 50px; font-size: 11px; }

        .detail-name-column {
          width: 190px;
          min-width: 190px;
          text-align: left !important;
          white-space: normal !important;
        }

        .detail-name-column small,
        .detail-name-column span { display: block; }
        .detail-name-column small { color: var(--text-3); margin-bottom: 2px; }

        .details-subtotal > * {
          background: color-mix(in srgb, var(--green-dim) 62%, var(--bg-card));
          font-weight: 800;
        }

        .empty-details {
          padding: 22px;
          color: var(--text-3);
          text-align: center;
        }

        .table-footnote {
          margin: 16px 8px 2px;
          color: var(--text-2);
          font-size: 12px;
        }

        .table-footnote span { color: var(--green-text); font-weight: 800; }

        @media (max-width: 900px) {
          .annual-shell { padding: 24px 14px 110px; }
          .annual-kpis { grid-template-columns: 1fr; gap: 10px; }
          .annual-kpi { min-height: 96px; }
          .annual-table-card { padding: 18px 10px 12px; }
        }

        @media (max-width: 620px) {
          .annual-header { flex-direction: column; }
          .table-heading { flex-direction: column; }
          .annual-header h1 { font-size: 30px; }
          .annual-header p { font-size: 14px; }
          .year-nav { margin-top: 18px; }
          .annual-kpi { padding: 16px; }
          .export-actions { display: grid; grid-template-columns: 1fr; }
          .export-actions button { width: 100%; }
          .email-dialog { padding: 26px 18px 20px; }
          .email-dialog-actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
