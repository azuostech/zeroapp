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
          className="textarea"
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
              className={`chip ${item.key === categoria ? 'active' : ''}`}
              onClick={() => setCategoria(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {currentStreak > 1 ? <div className="streak">🔥 {currentStreak} dias seguidos</div> : null}
        {bonusPreview ? <div className="bonus">{bonusPreview}</div> : null}

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
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
          background: #1a1418;
          border: 1px solid #44303a;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        h3 {
          margin: 0;
          color: #fb7185;
          font-size: 18px;
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #4e3742;
          background: #241b20;
          color: #c7a8b2;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: #c6b4bb;
          font-weight: 600;
        }

        .textarea {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #4b3842;
          background: #120d11;
          color: #fff4f7;
          padding: 10px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          min-height: 92px;
        }

        .textarea:focus {
          outline: none;
          border-color: rgba(251, 113, 133, 0.75);
          box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.15);
        }

        .chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 10px 0 4px;
          margin-bottom: 8px;
        }

        .chip {
          border-radius: 999px;
          border: 1px solid #4b3842;
          background: #1b1318;
          color: #d4bcc5;
          padding: 7px 10px;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .chip.active {
          border-color: rgba(251, 113, 133, 0.8);
          background: rgba(251, 113, 133, 0.2);
          color: #ffd5dd;
        }

        .streak {
          font-size: 12px;
          color: #ffb5c2;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .bonus {
          font-size: 12px;
          color: #ffd9df;
          margin-bottom: 10px;
        }

        .submit-btn {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 12px;
          background: #fb7185;
          color: #2b1118;
          font-weight: 800;
          cursor: pointer;
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
