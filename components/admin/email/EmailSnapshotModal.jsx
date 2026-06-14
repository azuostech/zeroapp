'use client';

import { useEffect, useMemo, useState } from 'react';

const BLOCK_LABELS = {
  receitas: '💵 Receitas',
  'pagar-primeiro': '🏦 Se Pagar 1º',
  doar: '🤝 Doar',
  contas: '📋 Pagar Contas',
  investimentos: '📈 Investimentos',
  desfrute: '✨ Desfrute'
};

function fmtMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function percent(realizado, previsto) {
  const base = Number(previsto || 0);
  if (!base) return 0;
  return Math.round((Number(realizado || 0) / base) * 100);
}

function displayName(log) {
  return log?.profile?.full_name || log?.recipient || 'Aluno';
}

export default function EmailSnapshotModal({ log, initialView = 'preview', onClose }) {
  const [view, setView] = useState(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView, log?.id]);

  const snapshot = log?.email_snapshot || null;
  const blocks = useMemo(() => Object.entries(snapshot?.blocos || {}), [snapshot]);

  if (!log) return null;

  const resendUrl = log.resend_id ? `https://resend.com/emails/${encodeURIComponent(log.resend_id)}` : null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Dados enviados</p>
            <h2>{displayName(log)}</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="tabs">
          <button type="button" className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>
            Preview
          </button>
          <button type="button" className={view === 'json' ? 'active' : ''} onClick={() => setView('json')}>
            JSON
          </button>
        </div>

        {!snapshot ? (
          <div className="empty">Este email não possui snapshot salvo.</div>
        ) : view === 'json' ? (
          <pre>{JSON.stringify(snapshot, null, 2)}</pre>
        ) : (
          <div className="snapshot-preview">
            <div className="intro">
              Relatório de <strong>{snapshot.month || snapshot.month_ref || 'período não informado'}</strong>
            </div>

            <section className="summary-grid">
              <div>
                <span>Saldo previsto</span>
                <strong>{fmtMoney(snapshot.saldo_previsto)}</strong>
              </div>
              <div>
                <span>Saldo realizado</span>
                <strong>{fmtMoney(snapshot.saldo_realizado)}</strong>
              </div>
              <div>
                <span>Fase</span>
                <strong>{snapshot.fase_emoji} {snapshot.fase || 'Bombeiro'}</strong>
              </div>
              <div>
                <span>ZeroCoins</span>
                <strong>{Number(snapshot.coins || 0).toLocaleString('pt-BR')} 🪙</strong>
              </div>
            </section>

            <section className="blocks">
              <h3>Blocos financeiros</h3>
              {blocks.length === 0 ? <p className="muted">Sem blocos no snapshot.</p> : null}
              {blocks.map(([key, value]) => {
                const previsto = Number(value?.previsto || 0);
                const realizado = Number(value?.realizado || 0);
                return (
                  <div key={key} className="block-row">
                    <span>{BLOCK_LABELS[key] || key}</span>
                    <strong>
                      {fmtMoney(realizado)} / {fmtMoney(previsto)}
                    </strong>
                    <em>{percent(realizado, previsto)}%</em>
                  </div>
                );
              })}
            </section>
          </div>
        )}

        <footer>
          {resendUrl ? (
            <a href={resendUrl} target="_blank" rel="noreferrer">
              Abrir email original no Resend
            </a>
          ) : (
            <span>Sem ID do Resend</span>
          )}
        </footer>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          padding: 20px;
        }

        .modal-sheet {
          width: min(720px, 100%);
          max-height: min(84vh, 780px);
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          box-shadow: var(--shadow-lg);
        }

        header {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 18px 14px;
          background: var(--bg-header);
          color: var(--text-on-green);
        }

        header p,
        header h2 {
          margin: 0;
        }

        header p {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.8;
        }

        header h2 {
          margin-top: 4px;
          font-size: 20px;
          font-weight: 900;
        }

        .close-btn {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.2);
          color: var(--text-on-green);
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .tabs {
          display: flex;
          gap: 8px;
          padding: 14px 18px 0;
        }

        .tabs button {
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          background: var(--bg-input);
          color: var(--text2);
          min-height: 34px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .tabs button.active {
          border-color: var(--border-green);
          background: var(--green-dim);
          color: var(--green-dark);
        }

        .empty,
        .snapshot-preview,
        pre {
          margin: 18px;
        }

        .empty {
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text2);
          padding: 18px;
          text-align: center;
        }

        pre {
          max-height: 50vh;
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text);
          padding: 14px;
          font-size: 12px;
        }

        .intro {
          margin-bottom: 14px;
          color: var(--text2);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .summary-grid div {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-section);
          padding: 12px;
        }

        .summary-grid span {
          display: block;
          margin-bottom: 6px;
          color: var(--text3);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .summary-grid strong {
          color: var(--green-dark);
          font-family: var(--font-mono);
          font-size: 15px;
        }

        .blocks h3 {
          margin: 0 0 10px;
          color: var(--text);
          font-size: 16px;
        }

        .block-row {
          display: grid;
          grid-template-columns: minmax(130px, 1fr) minmax(190px, 1fr) auto;
          gap: 10px;
          align-items: center;
          border-top: 1px solid var(--border);
          padding: 10px 0;
          color: var(--text2);
          font-size: 13px;
        }

        .block-row strong {
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 12px;
        }

        .block-row em {
          border-radius: var(--radius-full);
          background: var(--green-dim);
          color: var(--green-dark);
          padding: 4px 8px;
          font-style: normal;
          font-weight: 900;
          font-size: 11px;
        }

        .muted {
          color: var(--text3);
        }

        footer {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid var(--border);
          padding: 14px 18px 18px;
        }

        footer a,
        footer span {
          color: var(--green-dark);
          font-size: 12px;
          font-weight: 900;
        }

        @media (max-width: 640px) {
          .modal-overlay {
            padding: 8px;
          }

          .summary-grid,
          .block-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
