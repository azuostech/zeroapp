'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useIdentity } from '@/hooks/useIdentity';
import IdentidadeForm from '@/components/mavf/IdentidadeForm';
import IdentidadeManifesto from '@/components/mavf/IdentidadeManifesto';
import { formatDaysAgo, formatShortDateLabel, truncateText } from '@/src/modules/mavf/application/practices-format';

export default function IdentidadeCard({ summary, expanded, onToggle, onUpdate, targetUserId = null }) {
  const { declarations, total, ultima, isLoading, error, addDeclaration, removeDeclaration, refresh } = useIdentity(targetUserId);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const latest = summary?.ultima || ultima;
  const preview = latest?.declaracao ? truncateText(`Eu sou alguém que ${latest.declaracao}`, 68) : 'Seu manifesto ainda está em branco.';

  const sortedTimeline = useMemo(() => {
    return [...declarations].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [declarations]);

  const handleAdd = async (payload) => {
    const result = await addDeclaration(payload);
    await refresh();
    await onUpdate?.();
    return result;
  };

  const handleRemove = async (item) => {
    const confirmed = window.confirm('Deseja remover esta declaração de identidade?');
    if (!confirmed) return;

    try {
      await removeDeclaration(item.id);
      await onUpdate?.();
      toast.success('Declaração removida');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover declaração');
    }
  };

  return (
    <section className={`practice-card identity ${expanded ? 'expanded' : ''}`}>
      <button type="button" className="card-head" onClick={onToggle}>
        <div>
          <div className="head-title">💎 Minha Identidade</div>
          <div className="head-meta">
            {summary?.total ?? total} declarações
            {latest?.created_at ? ` · última ${formatDaysAgo(latest.created_at)}` : ''}
          </div>
          <div className="head-preview">{preview}</div>
        </div>
        <span className="chevron">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded ? (
        <div className="card-body">
          <button type="button" className="primary-btn" onClick={() => setIsFormOpen(true)}>
            💎 Adicionar declaração
          </button>

          {isLoading ? <div className="feedback">Carregando identidade...</div> : null}
          {error ? <div className="feedback error">{error}</div> : null}

          {!isLoading && !error ? (
            <>
              <IdentidadeManifesto declarations={sortedTimeline} />

              {sortedTimeline.length > 0 ? (
                <div className="timeline">
                  <div className="timeline-title">Linha do tempo</div>
                  <ul>
                    {sortedTimeline.map((item) => (
                      <li key={item.id}>
                        <div className="timeline-main">
                          <strong>Eu sou alguém que {item.declaracao}</strong>
                          <span>
                            {formatShortDateLabel(item.created_at)}
                            {item.encontro_ref ? ` · ${item.encontro_ref}` : ''}
                          </span>
                          {item.contexto ? <p>{item.contexto}</p> : null}
                        </div>
                        <button type="button" className="remove-btn" onClick={() => handleRemove(item)} aria-label="Remover declaração">
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-icon">💎</div>
                  <h4>Seu manifesto está em branco</h4>
                  <p>
                    Quem você está se tornando define o que você faz. Escreva sua primeira declaração de identidade.
                  </p>
                  <button type="button" className="ghost-btn" onClick={() => setIsFormOpen(true)}>
                    Escrever minha primeira declaração
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? <IdentidadeForm onSave={handleAdd} onClose={() => setIsFormOpen(false)} onSuccess={() => onUpdate?.()} /> : null}

      <style jsx>{`
        .practice-card {
          border: 1px solid #403a52;
          background: #171422;
          border-radius: 14px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .practice-card.expanded {
          border-color: rgba(167, 139, 250, 0.55);
          box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.22) inset;
        }

        .card-head {
          width: 100%;
          border: none;
          background: transparent;
          color: inherit;
          text-align: left;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 14px;
          cursor: pointer;
        }

        .head-title {
          color: #a78bfa;
          font-size: 17px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .head-meta {
          color: #b2a6d0;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .head-preview {
          color: #d7ceef;
          font-size: 13px;
          line-height: 1.4;
        }

        .chevron {
          color: #bfaeff;
          font-size: 18px;
          padding-top: 2px;
        }

        .card-body {
          border-top: 1px solid #433b58;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .primary-btn,
        .ghost-btn {
          border-radius: 10px;
          border: 1px solid #a78bfa;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .primary-btn {
          background: #a78bfa;
          color: #22144a;
        }

        .ghost-btn {
          background: transparent;
          color: #d8c8ff;
          border-color: rgba(167, 139, 250, 0.45);
        }

        .feedback {
          font-size: 13px;
          color: #b2a6cf;
        }

        .feedback.error {
          color: #ff9f9f;
        }

        .timeline {
          border: 1px solid #42395a;
          border-radius: 12px;
          background: #151223;
          padding: 10px;
        }

        .timeline-title {
          font-size: 12px;
          color: #c8b8f1;
          margin-bottom: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .timeline ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .timeline li {
          border: 1px solid #37304c;
          border-radius: 10px;
          background: #1a1530;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .timeline-main {
          min-width: 0;
          flex: 1;
        }

        .timeline-main strong {
          display: block;
          color: #f4efff;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .timeline-main span {
          font-size: 11px;
          color: #b8abd8;
        }

        .timeline-main p {
          margin: 6px 0 0;
          font-size: 12px;
          color: #cfc3ec;
          line-height: 1.35;
        }

        .remove-btn {
          border: 1px solid #5a4d7f;
          background: #231d36;
          color: #bfafd8;
          border-radius: 8px;
          width: 24px;
          height: 24px;
          cursor: pointer;
        }

        .remove-btn:hover {
          border-color: #d19ec9;
          color: #ffd0f6;
        }

        .empty {
          border: 1px dashed #594e78;
          border-radius: 12px;
          background: #171329;
          padding: 14px;
          text-align: center;
        }

        .empty-icon {
          font-size: 28px;
          margin-bottom: 6px;
        }

        .empty h4 {
          margin: 0 0 6px;
          color: #dfd4ff;
        }

        .empty p {
          margin: 0 0 10px;
          color: #c2b6de;
          font-size: 13px;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
