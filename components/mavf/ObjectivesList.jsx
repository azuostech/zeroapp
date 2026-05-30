'use client';

import { useEffect, useMemo, useState } from 'react';
import ObjectiveCard from '@/components/mavf/ObjectiveCard';
import CreateObjectiveModal from '@/components/mavf/CreateObjectiveModal';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

export default function ObjectivesList({ sessionId = null, targetUserId = null, adminMode = false }) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadObjectives();
  }, [targetUserId]);

  const doneCount = useMemo(() => objectives.filter((objective) => Number(objective.progress) === 100).length, [objectives]);

  const loadObjectives = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(withUserQuery('/api/mavf/objectives', targetUserId), { cache: 'no-store' });
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

      {adminMode ? <div className="feedback info">Modo administrador: editando objetivos do cliente.</div> : null}

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

      <CreateObjectiveModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        onCreated={handleCreated}
        sessionId={sessionId}
        targetUserId={targetUserId}
      />

      <style jsx>{`
        .objectives-wrap {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
        }

        .info-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          border: 1px solid color-mix(in srgb, var(--green) 35%, transparent);
          background: color-mix(in srgb, var(--green) 10%, transparent);
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
          color: var(--green);
          margin-bottom: 4px;
        }

        .info-text {
          font-size: 12px;
          color: var(--text-2);
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
          font-family: var(--font-mono);
        }

        .header-row p {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--muted);
        }

        .add-btn {
          border: 1px solid var(--green);
          background: var(--green);
          color: var(--bg);
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
          border: 1px solid color-mix(in srgb, var(--green) 40%, transparent);
          background: var(--green-dim);
          color: var(--green);
        }

        .feedback.error {
          border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
          background: color-mix(in srgb, var(--red) 10%, transparent);
          color: var(--red);
        }

        .feedback.info {
          border: 1px solid color-mix(in srgb, var(--blue) 35%, transparent);
          background: var(--blue-dim);
          color: var(--blue);
        }

        .loading-state,
        .empty-state {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
          padding: 28px 18px;
          text-align: center;
        }

        .loading-state {
          color: var(--muted);
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
          color: var(--text-3);
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
