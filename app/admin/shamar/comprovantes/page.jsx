'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.error || 'Erro na requisição');
  return payload;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
}

function dateLabel(value) {
  if (!value) return '—';
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR');
}

export default function AdminShamarProofsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadItems = async () => {
    setLoading(true);
    setMessage('');
    try {
      const payload = await apiRequest('/api/admin/shamar/contributions');
      setItems(payload?.contributions || []);
    } catch (error) {
      setMessage(error.message || 'Erro ao carregar comprovantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const verify = async (item, verified) => {
    const rejectionReason = verified ? null : window.prompt('Motivo da rejeição') || null;
    if (!verified && !rejectionReason) return;

    setProcessingId(item.id);
    setMessage('');
    try {
      await apiRequest(`/api/admin/shamar/contributions/${encodeURIComponent(item.id)}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified, rejection_reason: rejectionReason })
      });
      setItems((current) => current.filter((row) => row.id !== item.id));
      setMessage(verified ? 'Comprovante validado.' : 'Comprovante rejeitado.');
    } catch (error) {
      setMessage(error.message || 'Erro ao processar comprovante');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="proofs-admin">
      <header className="top">
        <div>
          <Link href="/admin/shamar" className="back">← SHAMAR Admin</Link>
          <h1>Comprovantes SHAMAR</h1>
          <p>Aportes aguardando validação administrativa.</p>
        </div>
        <button type="button" onClick={loadItems}>Atualizar</button>
      </header>

      {message ? <div className="message">{message}</div> : null}

      <section className="panel">
        {loading ? <div className="empty">Carregando comprovantes...</div> : null}
        {!loading && items.length === 0 ? <div className="empty">Nenhum comprovante pendente.</div> : null}

        <div className="proof-list">
          {items.map((item) => {
            const profile = item.profile || {};
            const config = item.season?.config || {};
            return (
              <article className="proof-card" key={item.id}>
                <div className="proof-main">
                  <span className="badge">{config.turma || profile.turma || 'SHAMAR'}</span>
                  <h2>{profile.full_name || profile.email || 'Mentorado'}</h2>
                  <p>{profile.email || '—'}</p>
                  <div className="metrics">
                    <span>{money(item.amount)}</span>
                    <span>{dateLabel(item.contributed_at)}</span>
                    <span>{item.season?.identity_level || 'guardiao'}</span>
                  </div>
                  {item.observation ? <p className="observation">{item.observation}</p> : null}
                </div>
                <div className="proof-actions">
                  {item.proof_signed_url ? (
                    <a href={item.proof_signed_url} target="_blank" rel="noreferrer">Abrir comprovante</a>
                  ) : (
                    <span className="no-link">Sem link assinado</span>
                  )}
                  <button type="button" disabled={processingId === item.id} onClick={() => verify(item, true)}>
                    Validar
                  </button>
                  <button type="button" className="danger" disabled={processingId === item.id} onClick={() => verify(item, false)}>
                    Rejeitar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        .proofs-admin {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 28px;
          font-family: var(--font-body);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .back,
        .proof-actions a {
          color: var(--green);
          text-decoration: none;
          font-weight: 900;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 8px;
          font-family: var(--font-display);
          font-size: 30px;
        }

        .top p,
        .proof-card p,
        .no-link {
          color: var(--muted);
        }

        .message,
        .panel {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg-card);
          box-shadow: var(--shadow-card);
        }

        .message {
          padding: 10px 12px;
          margin-bottom: 14px;
          color: var(--green-dark);
          background: var(--green-dim);
          border-color: var(--border-green);
          font-weight: 800;
        }

        .panel {
          padding: 14px;
        }

        .empty {
          padding: 18px;
          color: var(--muted);
        }

        .proof-list {
          display: grid;
          gap: 12px;
        }

        .proof-card {
          border: 1px solid var(--border-2);
          border-radius: 12px;
          background: var(--bg-surface);
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: center;
        }

        .badge {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 3px 9px;
          background: var(--green-dim);
          color: var(--green-dark);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .metrics {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .metrics span {
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px 8px;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
        }

        .observation {
          margin-top: 10px;
          font-size: 13px;
        }

        .proof-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button {
          border: 1px solid var(--green);
          border-radius: 8px;
          background: var(--green);
          color: #03140b;
          padding: 8px 11px;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        button.danger {
          background: transparent;
          color: var(--red);
          border-color: color-mix(in srgb, var(--red) 40%, transparent);
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .proofs-admin {
            padding: 18px 12px;
          }

          .proof-card {
            grid-template-columns: 1fr;
          }

          .proof-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
