'use client';

import { useEffect, useMemo, useState } from 'react';
import ObjectiveCard from '@/components/mavf/ObjectiveCard';
import CreateObjectiveModal from '@/components/mavf/CreateObjectiveModal';

export default function ObjectivesList({ sessionId = null }) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadObjectives();
  }, []);

  const doneCount = useMemo(() => objectives.filter((objective) => Number(objective.progress) === 100).length, [objectives]);

  const loadObjectives = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/mavf/objectives', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Erro ao carregar objetivos.');
        setObjectives([]);
        return;
      }

      setObjectives(payload.objectives || []);
    } catch (_) {
      setError('Erro de conexão ao carregar objetivos.');
      setObjectives([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLocalObjective = (updatedObjective) => {
    if (!updatedObjective) return;
    setObjectives((previous) => previous.map((item) => (item.id === updatedObjective.id ? updatedObjective : item)));
    setFeedback('Objetivo atualizado.');
    setTimeout(() => setFeedback(''), 2400);
  };

  const handleCreated = (createdObjective) => {
    if (!createdObjective) return;
    setObjectives((previous) => [createdObjective, ...previous]);
    setFeedback('Objetivo criado com sucesso.');
    setTimeout(() => setFeedback(''), 2400);
  };

  const handleDelete = async (objective) => {
    const ok = window.confirm('Deseja realmente excluir este objetivo? Essa ação é permanente.');
    if (!ok) return;

    try {
      const response = await fetch(`/api/mavf/objectives/${objective.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Erro ao excluir objetivo.');
        return;
      }

      setObjectives((previous) => previous.filter((item) => item.id !== objective.id));
      setFeedback('Objetivo removido.');
      setTimeout(() => setFeedback(''), 2400);
    } catch (_) {
      setError('Erro de conexão ao excluir objetivo.');
    }
  };

  return (
    <section className="objectives-wrap">
      <div className="info-box">
        <div className="info-emoji">🎯</div>
        <div>
          <div className="info-title">Guia de Objetivos da Mentoria</div>
          <div className="info-text">
            Defina suas metas por pilar do MAVF, acompanhe o progresso e ajuste o plano ao longo da mentoria.
          </div>
        </div>
      </div>

      <div className="header-row">
        <div>
          <h2>Objetivos</h2>
          <p>
            {objectives.length} objetivo(s) • {doneCount} concluído(s)
          </p>
        </div>
        <button type="button" className="add-btn" onClick={() => setCreating(true)}>
          + Adicionar
        </button>
      </div>

      {feedback ? <div className="feedback success">{feedback}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">Carregando objetivos...</div>
      ) : objectives.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">📝</div>
          <h3>Nenhum objetivo definido</h3>
          <p>Comece criando seu primeiro objetivo para um pilar do MAVF.</p>
          <button type="button" className="add-btn" onClick={() => setCreating(true)}>
            + Adicionar Objetivo
          </button>
        </div>
      ) : (
        <div className="objectives-grid">
          {objectives.map((objective) => (
            <ObjectiveCard key={objective.id} objective={objective} onUpdated={updateLocalObjective} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateObjectiveModal isOpen={creating} onClose={() => setCreating(false)} onCreated={handleCreated} sessionId={sessionId} />

      <style jsx>{`
        .objectives-wrap {
          background: #222222;
          border: 1px solid #333333;
          border-radius: 12px;
          padding: 16px;
        }

        .info-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          border: 1px solid rgba(0, 200, 83, 0.35);
          background: rgba(0, 200, 83, 0.1);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .info-emoji {
          font-size: 22px;
          line-height: 1;
        }

        .info-title {
          font-size: 13px;
          font-weight: 700;
          color: #00c853;
          margin-bottom: 4px;
        }

        .info-text {
          font-size: 12px;
          color: #bbb;
          line-height: 1.45;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .header-row h2 {
          margin: 0;
          font-size: 20px;
          font-family: 'Space Mono', monospace;
        }

        .header-row p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #888;
        }

        .add-btn {
          border: 1px solid #00c853;
          background: #00c853;
          color: #08130d;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .add-btn:hover {
          filter: brightness(0.95);
        }

        .feedback {
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .feedback.success {
          border: 1px solid rgba(0, 200, 83, 0.4);
          background: rgba(0, 200, 83, 0.12);
          color: #8bebb2;
        }

        .feedback.error {
          border: 1px solid rgba(255, 82, 82, 0.4);
          background: rgba(255, 82, 82, 0.1);
          color: #ff8f8f;
        }

        .loading-state,
        .empty-state {
          border: 1px solid #333;
          border-radius: 12px;
          background: #1a1a1a;
          padding: 28px 18px;
          text-align: center;
        }

        .loading-state {
          color: #888;
          font-size: 13px;
        }

        .empty-emoji {
          font-size: 42px;
          opacity: 0.5;
          margin-bottom: 8px;
        }

        .empty-state h3 {
          margin: 0 0 6px;
          font-size: 18px;
        }

        .empty-state p {
          margin: 0 0 14px;
          color: #999;
          font-size: 13px;
        }

        .objectives-grid {
          display: grid;
          gap: 12px;
        }
      `}</style>
    </section>
  );
}
