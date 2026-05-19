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
    <section className={`practice-card gains ${expanded ? 'expanded' : ''}`}>
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
          border: 1px solid #2d3330;
          background: #151816;
          border-radius: 14px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .practice-card.expanded {
          border-color: rgba(0, 200, 83, 0.45);
          box-shadow: 0 0 0 1px rgba(0, 200, 83, 0.2) inset;
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
          color: #00c853;
          font-size: 17px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .head-meta {
          color: #8ea195;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .head-preview {
          color: #c2d0c8;
          font-size: 13px;
          line-height: 1.4;
        }

        .chevron {
          color: #85b194;
          font-size: 18px;
          padding-top: 2px;
        }

        .card-body {
          border-top: 1px solid #2b332f;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .primary-btn,
        .ghost-btn {
          border-radius: 10px;
          border: 1px solid #00c853;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .primary-btn {
          background: #00c853;
          color: #06220f;
        }

        .ghost-btn {
          background: transparent;
          color: #9df0be;
          border-color: rgba(0, 200, 83, 0.45);
        }

        .feedback {
          font-size: 13px;
          color: #9daf9f;
        }

        .feedback.error {
          color: #ff8f8f;
        }

        .items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .more {
          text-align: center;
          font-size: 11px;
          color: #88a193;
        }

        .empty {
          border: 1px dashed #2f3a32;
          border-radius: 12px;
          background: #111612;
          padding: 14px;
          text-align: center;
        }

        .empty-icon {
          font-size: 28px;
          margin-bottom: 6px;
        }

        .empty h4 {
          margin: 0 0 6px;
          color: #d8e6de;
        }

        .empty p {
          margin: 0 0 10px;
          color: #9eb1a7;
          font-size: 13px;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
