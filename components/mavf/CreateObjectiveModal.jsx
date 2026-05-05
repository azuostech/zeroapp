'use client';

import { useMemo, useState } from 'react';
import { MAVF_PILLARS } from '@/lib/mavf-config';

const TODAY = new Date().toISOString().slice(0, 10);

export default function CreateObjectiveModal({ isOpen, onClose, onCreated, sessionId = null }) {
  const [pillar, setPillar] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(TODAY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pillars = useMemo(() => MAVF_PILLARS, []);

  if (!isOpen) return null;

  const resetForm = () => {
    setPillar('');
    setDescription('');
    setDeadline(TODAY);
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedDescription = description.trim();
    if (!pillar || !trimmedDescription || !deadline) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (trimmedDescription.length < 10) {
      setError('A descrição precisa ter no mínimo 10 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/mavf/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar,
          description: trimmedDescription,
          deadline,
          session_id: sessionId || null
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Erro ao criar objetivo.');
        return;
      }

      onCreated?.(payload.objective);
      resetForm();
      onClose?.();
    } catch (_) {
      setError('Erro de conexão ao salvar objetivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="objective-modal-overlay" onClick={handleClose}>
      <div className="objective-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="objective-modal-header">
          <h3>Novo Objetivo</h3>
          <button type="button" className="close-btn" onClick={handleClose} disabled={loading}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="objective-form">
          <div className="form-group">
            <label>Pilar</label>
            <select value={pillar} onChange={(event) => setPillar(event.target.value)} required>
              <option value="">Selecione um pilar...</option>
              {pillars.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Descrição da meta</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Ex: Aumentar minha renda mensal em 30% até o final da mentoria."
              required
            />
            <small>{description.trim().length}/10 mínimo</small>
          </div>

          <div className="form-group">
            <label>Data limite</label>
            <input type="date" min={TODAY} value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={handleClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-save" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar objetivo'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .objective-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 700;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .objective-modal-content {
          width: 100%;
          max-width: 560px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 14px;
          overflow: hidden;
        }

        .objective-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid #333;
        }

        .objective-modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-family: 'Space Mono', monospace;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: #aaa;
          cursor: pointer;
          border-radius: 6px;
          padding: 4px 8px;
        }

        .close-btn:hover:enabled {
          background: #2a2a2a;
          color: #fff;
        }

        .objective-form {
          padding: 16px 18px 18px;
        }

        .form-group {
          margin-bottom: 14px;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          color: #aaa;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          border: 1px solid #333;
          background: #111;
          color: #f0f0f0;
          border-radius: 8px;
          padding: 10px 12px;
          outline: none;
        }

        .form-group select:focus,
        .form-group input:focus,
        .form-group textarea:focus {
          border-color: rgba(0, 200, 83, 0.55);
        }

        .form-group small {
          display: block;
          margin-top: 5px;
          font-size: 11px;
          color: #777;
        }

        .error-box {
          border: 1px solid rgba(255, 82, 82, 0.4);
          background: rgba(255, 82, 82, 0.1);
          color: #ff7b7b;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }

        .btn {
          flex: 1;
          border-radius: 8px;
          padding: 10px 12px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-cancel {
          border: 1px solid #333;
          background: transparent;
          color: #bbb;
        }

        .btn-cancel:hover:enabled {
          border-color: #555;
          color: #fff;
        }

        .btn-save {
          border: 1px solid #00c853;
          background: #00c853;
          color: #08150e;
        }

        .btn-save:hover:enabled {
          filter: brightness(0.94);
        }
      `}</style>
    </div>
  );
}
