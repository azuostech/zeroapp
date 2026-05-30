'use client';

import { useMemo, useState } from 'react';
import { MAVF_PILLARS_MAP } from '@/lib/mavf-config';
import ProgressSlider from '@/components/mavf/ProgressSlider';

function getProgressColor(progress) {
  if (progress >= 75) return 'var(--green)';
  if (progress >= 50) return 'var(--gold)';
  if (progress >= 25) return 'var(--blue)';
  return 'var(--muted)';
}

function formatDate(value) {
  if (!value) return 'Sem prazo';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export default function ObjectiveCard({ objective, onUpdated, onDelete }) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [error, setError] = useState('');
  const [nextProgress, setNextProgress] = useState(objective.progress || 0);
  const [nextDescription, setNextDescription] = useState(objective.description || '');
  const [nextDeadline, setNextDeadline] = useState(objective.deadline || '');

  const pillar = useMemo(() => MAVF_PILLARS_MAP[objective.pillar], [objective.pillar]);
  const progressColor = getProgressColor(objective.progress || 0);

  const saveProgress = async (progress) => {
    setError('');
    setSavingProgress(true);
    try {
      const response = await fetch(`/api/mavf/objectives/${objective.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Erro ao atualizar progresso.');
        return;
      }

      setEditingProgress(false);
      onUpdated?.(payload.objective);
    } catch (_) {
      setError('Erro de conexão ao atualizar progresso.');
    } finally {
      setSavingProgress(false);
    }
  };

  const saveMeta = async () => {
    const description = nextDescription.trim();
    if (description.length < 10) {
      setError('A descrição precisa ter pelo menos 10 caracteres.');
      return;
    }

    if (!nextDeadline) {
      setError('Defina uma data limite para o objetivo.');
      return;
    }

    setError('');
    setSavingMeta(true);
    try {
      const response = await fetch(`/api/mavf/objectives/${objective.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          deadline: nextDeadline
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Erro ao atualizar objetivo.');
        return;
      }

      setEditingMeta(false);
      onUpdated?.(payload.objective);
    } catch (_) {
      setError('Erro de conexão ao salvar objetivo.');
    } finally {
      setSavingMeta(false);
    }
  };

  return (
    <div className="objective-card">
      <div className="objective-header">
        <div className="pillar-chip">
          <span className="pillar-emoji">{pillar?.emoji || '🎯'}</span>
          <span className="pillar-label">{pillar?.label || objective.pillar}</span>
        </div>
        <button type="button" className="delete-btn" onClick={() => onDelete?.(objective)}>
          🗑️
        </button>
      </div>

      {editingMeta ? (
        <div className="meta-editor">
          <textarea value={nextDescription} rows={3} onChange={(event) => setNextDescription(event.target.value)} />
          <input type="date" value={nextDeadline} onChange={(event) => setNextDeadline(event.target.value)} />
          <div className="meta-actions">
            <button
              type="button"
              className="small-btn btn-cancel"
              onClick={() => {
                setEditingMeta(false);
                setNextDescription(objective.description || '');
                setNextDeadline(objective.deadline || '');
                setError('');
              }}
              disabled={savingMeta}
            >
              Cancelar
            </button>
            <button type="button" className="small-btn btn-save" onClick={saveMeta} disabled={savingMeta}>
              {savingMeta ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <p className="objective-description">{objective.description}</p>
      )}

      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-title">Progresso</span>
          <strong style={{ color: progressColor }}>{objective.progress}%</strong>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${objective.progress}%`,
              ['--progress-color']: progressColor
            }}
          />
        </div>

        {editingProgress ? (
          <ProgressSlider
            value={nextProgress}
            onChange={setNextProgress}
            onSave={saveProgress}
            onCancel={() => {
              setEditingProgress(false);
              setNextProgress(objective.progress || 0);
              setError('');
            }}
            saving={savingProgress}
          />
        ) : (
          <button type="button" className="update-progress-btn" onClick={() => setEditingProgress(true)}>
            Atualizar progresso
          </button>
        )}
      </div>

      <div className="objective-footer">
        <div className="deadline">📅 {formatDate(objective.deadline)}</div>
        {!editingMeta ? (
          <button type="button" className="edit-meta-btn" onClick={() => setEditingMeta(true)}>
            Editar meta
          </button>
        ) : null}
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <style jsx>{`
        .objective-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
        }

        .objective-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .pillar-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .pillar-emoji {
          font-size: 20px;
        }

        .pillar-label {
          color: var(--text-2);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .delete-btn {
          border: none;
          background: transparent;
          color: var(--text-3);
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
        }

        .delete-btn:hover {
          opacity: 1;
        }

        .objective-description {
          margin: 0 0 12px;
          font-size: 14px;
          color: var(--text);
          line-height: 1.5;
          font-weight: 600;
          white-space: pre-wrap;
        }

        .progress-section {
          margin-bottom: 12px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
          font-size: 12px;
        }

        .progress-title {
          color: var(--muted);
        }

        .progress-track {
          height: 7px;
          background: var(--bg3);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.35s ease;
          background: linear-gradient(
            90deg,
            var(--progress-color),
            color-mix(in srgb, var(--progress-color) 72%, transparent)
          );
        }

        .update-progress-btn {
          margin-top: 10px;
          width: 100%;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-3);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .update-progress-btn:hover {
          color: var(--green);
          border-color: color-mix(in srgb, var(--green) 40%, transparent);
          background: color-mix(in srgb, var(--green) 8%, transparent);
        }

        .objective-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
        }

        .deadline {
          color: var(--muted);
          font-size: 12px;
        }

        .edit-meta-btn {
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-2);
          border-radius: 7px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .edit-meta-btn:hover {
          color: var(--text);
        }

        .meta-editor textarea,
        .meta-editor input {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          border-radius: 8px;
          padding: 9px 10px;
          outline: none;
          margin-bottom: 8px;
        }

        .meta-editor textarea:focus,
        .meta-editor input:focus {
          border-color: color-mix(in srgb, var(--green) 50%, transparent);
        }

        .meta-actions {
          display: flex;
          gap: 8px;
        }

        .small-btn {
          flex: 1;
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .small-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-cancel {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
        }

        .btn-save {
          border: 1px solid var(--green);
          background: var(--green);
          color: var(--bg);
        }

        .error-box {
          margin-top: 10px;
          border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
          background: color-mix(in srgb, var(--red) 10%, transparent);
          color: var(--red);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
