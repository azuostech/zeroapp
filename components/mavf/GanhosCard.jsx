'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useGains } from '@/hooks/useGains';
import GanhoForm from '@/components/mavf/GanhoForm';
import GanhoItem from '@/components/mavf/GanhoItem';
import { truncateText } from '@/src/modules/mavf/application/practices-format';

export default function GanhosCard({ summary, expanded, onToggle, onUpdate, targetUserId = null }) {
  const { gains, stats, isLoading, error, addGain, removeGain, refresh } = useGains(targetUserId);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const preview = useMemo(() => {
    if (summary?.ultimo?.descricao) return truncateText(summary.ultimo.descricao, 60);
    return 'Sem ganhos registrados ainda.';
  }, [summary]);

  const visibleItems = useMemo(() => gains.slice(0, 20), [gains]);

  const handleAdd = async (payload) => {
    const result = await addGain(payload);
    await refresh();
    await onUpdate?.();
    return result;
  };

  const handleRemove = async (gain) => {
    const confirmed = window.confirm('Deseja remover este ganho?');
    if (!confirmed) return;

    try {
      await removeGain(gain.id);
      await refresh();
      await onUpdate?.();
      toast.success('Ganho removido');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover ganho');
    }
  };

  return (
    <section className={`practice-card gains card ${expanded ? 'expanded' : ''}`}>
      <button type="button" className="card-head" onClick={onToggle}>
        <div>
          <div className="head-title">⚡ Meus Ganhos</div>
          <div className="head-meta">
            {summary?.total ?? stats.total} ganhos registrados · +{summary?.semana ?? stats.semana} essa semana
          </div>
          <div className="head-preview">{preview}</div>
        </div>
        <span className="chevron">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded ? (
        <div className="card-body">
          <button type="button" className="primary-btn" onClick={() => setIsFormOpen(true)}>
            ⚡ Registrar novo ganho
          </button>

          {isLoading ? <div className="feedback">Carregando ganhos...</div> : null}
          {error ? <div className="feedback error">{error}</div> : null}

          {!isLoading && !error ? (
            visibleItems.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">⚡</div>
                <h4>Nenhum ganho registrado ainda</h4>
                <p>
                  Cada passo conta, do menor ao maior. Registre seu primeiro ganho agora.
                </p>
                <button type="button" className="ghost-btn" onClick={() => setIsFormOpen(true)}>
                  Registrar meu primeiro ganho
                </button>
              </div>
            ) : (
              <div className="items">
                {visibleItems.map((gain) => (
                  <GanhoItem key={gain.id} gain={gain} onRemove={handleRemove} />
                ))}
                {Number(stats.total) > 20 ? <div className="more">Mostrando 20 de {stats.total} ganhos</div> : null}
              </div>
            )
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? <GanhoForm onSave={handleAdd} onClose={() => setIsFormOpen(false)} onSuccess={() => onUpdate?.()} /> : null}

      <style jsx>{`
        .practice-card {
          margin-bottom: 12px;
          overflow: hidden;
        }

        .practice-card.expanded {
          border-color: var(--green-mid);
          box-shadow: 0 0 0 1px var(--green-dim) inset;
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
          border-left: 3px solid var(--green);
        }

        .head-title {
          color: var(--green);
          font-size: 17px;
          font-family: var(--font-body);
          font-weight: 700;
          margin-bottom: 4px;
          filter: drop-shadow(0 3px 8px var(--green-glow));
        }

        .head-meta {
          color: var(--text-2);
          font-size: 12px;
          margin-bottom: 4px;
          font-family: var(--font-mono);
        }

        .head-preview {
          color: var(--text);
          font-size: 13px;
          line-height: 1.4;
        }

        .chevron {
          color: var(--green);
          font-size: 18px;
          padding-top: 2px;
        }

        .card-body {
          border-top: 1px solid var(--border-2);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .primary-btn,
        .ghost-btn {
          border-radius: var(--radius-md);
          border: 1px solid var(--green-mid);
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: var(--transition);
        }

        .primary-btn {
          background: var(--green);
          color: var(--bg);
        }

        .ghost-btn {
          background: var(--green-dim);
          color: var(--green);
          border-color: var(--green-mid);
        }

        .feedback {
          font-size: 13px;
          color: var(--text-2);
        }

        .feedback.error {
          color: var(--red);
        }

        .items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .more {
          text-align: center;
          font-size: 11px;
          color: var(--text-3);
          font-family: var(--font-mono);
        }

        .empty {
          border: 1px dashed var(--border-3);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--bg-card) 80%, transparent);
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
          font-family: var(--font-body);
          font-weight: 700;
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
