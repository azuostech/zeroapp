'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { key: 'financeiro', label: '💰 Financeiro' },
  { key: 'crescimento', label: '🌱 Crescimento' },
  { key: 'relacionamentos', label: '👥 Relacionamentos' },
  { key: 'saude', label: '💚 Saúde' },
  { key: 'outro', label: '✨ Outro' }
];

export default function GratidaoForm({ onSave, onClose, onSuccess, currentStreak = 0 }) {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('financeiro');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = descricao.trim().length > 0 && !isSaving;
  const projectedStreak = Number(currentStreak || 0) + 1;

  const bonusPreview = useMemo(() => {
    if (projectedStreak === 7) return 'Se mantiver hoje, libera bônus de +50 🪙';
    if (projectedStreak === 30) return 'Se mantiver hoje, libera bônus de +150 🪙';
    return null;
  }, [projectedStreak]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSaving(true);
      const payload = await onSave?.({
        descricao: descricao.trim(),
        categoria
      });

      if (payload?.coins_awarded?.amount > 0) {
        toast.success(payload.coins_awarded.descricao || `+${payload.coins_awarded.amount} 🪙`, {
          icon: '🪙',
          duration: 3000
        });
      }

      if (payload?.balance) {
        window.dispatchEvent(
          new CustomEvent('zero:coins-updated', {
            detail: {
              sourceId: 'mavf-gratitude-form',
              payload: {
                coins: Number(payload.balance.coins || 0),
                coins_total: Number(payload.balance.coins_total || 0),
                phase: String(payload.balance.phase || 'BOMBEIRO'),
                amount_awarded: Number(payload?.coins_awarded?.amount || 0),
                triggerAnimation: Number(payload?.coins_awarded?.amount || 0) > 0
              }
            }
          })
        );
      }
      onSuccess?.(payload);
      onClose?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar gratidão');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Registrar gratidão">
      <form className="sheet" onSubmit={handleSubmit}>
        <div className="sheet-header">
          <h3>🌸 Registrar gratidão</h3>
          <button type="button" className="close-btn" onClick={onClose} disabled={isSaving}>
            ×
          </button>
        </div>

        <label className="label" htmlFor="grat-description">
          Pelo que você é grato hoje?
        </label>
        <textarea
          id="grat-description"
          className="textarea input"
          rows={4}
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          placeholder="Ex: Sou grato por ter conseguido pagar minhas contas em dia hoje."
          maxLength={280}
        />

        <div className="chips" role="group" aria-label="Categoria da gratidão">
          {CATEGORIES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`chip badge badge-neutral ${item.key === categoria ? 'active' : ''}`}
              onClick={() => setCategoria(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {currentStreak > 1 ? <div className="streak">🔥 {currentStreak} dias seguidos</div> : null}
        {bonusPreview ? <div className="bonus">{bonusPreview}</div> : null}

        <button type="submit" className="submit-btn btn-primary" disabled={!canSubmit}>
          {isSaving ? 'Registrando...' : 'Registrar Gratidão'}
        </button>
      </form>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: rgba(8, 5, 7, 0.72);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
        }

        .sheet {
          width: 100%;
          max-width: 560px;
          background: var(--bg-card);
          border: 1px solid rgba(251, 113, 133, 0.32);
          border-radius: var(--radius-lg);
          padding: 14px;
          box-shadow: var(--shadow-lg);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        h3 {
          margin: 0;
          color: var(--rose);
          font-family: var(--font-display);
          font-size: 18px;
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(251, 113, 133, 0.28);
          background: color-mix(in srgb, var(--rose-dim) 35%, var(--bg-surface));
          color: var(--text-2);
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          color: var(--text-3);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .textarea:focus {
          border-color: rgba(251, 113, 133, 0.7);
          box-shadow: 0 0 0 3px var(--rose-dim);
        }

        .chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 10px 0 4px;
          margin-bottom: 8px;
        }

        .chip {
          padding: 7px 10px;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .chip.active {
          border-color: rgba(251, 113, 133, 0.7);
          background: var(--rose-dim);
          color: var(--rose);
        }

        .streak {
          font-size: 12px;
          color: var(--rose);
          margin-bottom: 4px;
          font-weight: 700;
        }

        .bonus {
          font-size: 12px;
          color: var(--text-2);
          margin-bottom: 10px;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          background: var(--rose);
          border-color: rgba(251, 113, 133, 0.6);
          color: #2b1118;
          font-size: 14px;
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
