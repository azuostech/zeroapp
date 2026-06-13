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
    <section className={`practice-card identity card ${expanded ? 'expanded' : ''}`}>
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
          margin-bottom: 12px;
          overflow: hidden;
        }

        .practice-card.identity {
          background: var(--bg-card);
          border-color: var(--border);
          box-shadow: var(--shadow-card);
        }

        .practice-card.expanded {
          border-color: color-mix(in srgb, var(--purple) 62%, transparent);
          box-shadow: var(--shadow-card), 0 0 0 1px var(--purple-dim) inset;
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
          border-left: 3px solid var(--purple);
          transition: var(--transition);
        }

        .card-head:hover {
          background: color-mix(in srgb, var(--purple-dim) 40%, transparent);
        }

        .head-title {
          color: var(--text);
          font-size: 17px;
          font-family: var(--font-body);
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 4px;
        }

        .head-meta {
          color: var(--text-2);
          font-size: 12px;
          margin-bottom: 4px;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        .head-preview {
          color: var(--text-2);
          font-size: 13px;
          line-height: 1.4;
        }

        .chevron {
          color: var(--purple);
          font-size: 18px;
          padding-top: 2px;
        }

        .card-body {
          border-top: 1px solid var(--border-2);
          background: color-mix(in srgb, var(--bg2) 72%, transparent);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .primary-btn,
        .ghost-btn {
          border-radius: var(--radius-md);
          border: 1px solid color-mix(in srgb, var(--purple) 60%, transparent);
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: var(--transition);
        }

        .primary-btn {
          background: var(--purple);
          color: var(--text-on-green);
        }

        .ghost-btn {
          background: var(--purple-dim);
          color: var(--purple);
        }

        .primary-btn:hover,
        .ghost-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--purple) 24%, transparent);
        }

        .primary-btn:focus-visible,
        .ghost-btn:focus-visible {
          outline: 2px solid var(--purple);
          outline-offset: 2px;
        }

        .feedback {
          font-size: 13px;
          color: var(--text-2);
        }

        .feedback.error {
          color: var(--red);
        }

        .timeline {
          border: 1px solid color-mix(in srgb, var(--purple) 35%, transparent);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--purple) 8%, transparent);
          padding: 10px;
        }

        .timeline-title {
          font-size: 12px;
          color: var(--purple);
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
          border: 1px solid color-mix(in srgb, var(--purple) 28%, transparent);
          border-radius: var(--radius-sm);
          background: color-mix(in srgb, var(--bg-surface) 86%, transparent);
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
          color: var(--purple);
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .timeline-main span {
          font-size: 11px;
          color: var(--text-3);
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        .timeline-main p {
          margin: 6px 0 0;
          font-size: 12px;
          color: var(--text-2);
          line-height: 1.35;
        }

        .remove-btn {
          border: 1px solid color-mix(in srgb, var(--purple) 35%, transparent);
          background: var(--bg-surface);
          color: var(--text-2);
          border-radius: 8px;
          width: 24px;
          height: 24px;
          cursor: pointer;
        }

        .remove-btn:hover {
          border-color: var(--purple);
          color: var(--purple);
        }

        .empty {
          border: 1px dashed var(--border-3);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--purple-dim) 58%, transparent);
          padding: 14px;
          text-align: center;
        }

        .empty-icon {
          font-size: 28px;
          margin-bottom: 6px;
        }

        .empty h4 {
          margin: 0 0 6px;
          color: var(--text);
        }

        .empty p {
          margin: 0 0 10px;
          color: var(--text-3);
          font-size: 13px;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
