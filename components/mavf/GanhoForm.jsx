'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const SIZE_OPTIONS = [
  {
    key: 'pequeno',
    icon: '🌱',
    label: 'Pequeno',
    placeholder: 'Ex: Não fiz compra por impulso hoje'
  },
  {
    key: 'medio',
    icon: '⚡',
    label: 'Médio',
    placeholder: 'Ex: Economizei R$ 80 trocando de plano'
  },
  {
    key: 'grande',
    icon: '🏆',
    label: 'Grande',
    placeholder: 'Ex: Negociei minha dívida do cartão'
  }
];

export default function GanhoForm({ onSave, onClose, onSuccess }) {
  const [descricao, setDescricao] = useState('');
  const [tamanho, setTamanho] = useState('pequeno');
  const [isSaving, setIsSaving] = useState(false);

  const selectedOption = useMemo(() => SIZE_OPTIONS.find((item) => item.key === tamanho) || SIZE_OPTIONS[0], [tamanho]);
  const canSubmit = descricao.trim().length > 0 && !isSaving;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSaving(true);
      const payload = await onSave?.({
        descricao: descricao.trim(),
        tamanho
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
              sourceId: 'mavf-gain-form',
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
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar ganho');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Registrar ganho">
      <form className="sheet" onSubmit={handleSubmit}>
        <div className="sheet-header">
          <h3>⚡ Registrar ganho</h3>
          <button type="button" className="close-btn" onClick={onClose} disabled={isSaving}>
            ×
          </button>
        </div>

        <p className="subtitle">Todo avanço conta, mesmo os pequenos.</p>

        <label className="label" htmlFor="gain-description">
          O que você conquistou?
        </label>
        <textarea
          id="gain-description"
          className="textarea"
          rows={4}
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          placeholder={selectedOption.placeholder}
          maxLength={280}
        />

        <div className="size-grid" role="group" aria-label="Tamanho do ganho">
          {SIZE_OPTIONS.map((option) => {
            const active = option.key === tamanho;
            return (
              <button
                key={option.key}
                type="button"
                className={`size-btn ${active ? 'active' : ''}`}
                onClick={() => setTamanho(option.key)}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          {isSaving ? 'Registrando...' : 'Registrar Ganho'}
        </button>
      </form>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: rgba(4, 8, 6, 0.74);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
        }

        .sheet {
          width: 100%;
          max-width: 560px;
          background: #141915;
          border: 1px solid #2f3932;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        h3 {
          margin: 0;
          color: #00c853;
          font-size: 18px;
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #334039;
          background: #18201b;
          color: #9daf9f;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        .subtitle {
          margin: 0 0 12px;
          color: #96a79d;
          font-size: 13px;
        }

        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          color: #a9b8af;
          font-weight: 600;
        }

        .textarea {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #334039;
          background: #0f1411;
          color: #ecf4ef;
          padding: 10px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          min-height: 92px;
          margin-bottom: 10px;
        }

        .textarea:focus {
          outline: none;
          border-color: rgba(0, 200, 83, 0.6);
          box-shadow: 0 0 0 3px rgba(0, 200, 83, 0.12);
        }

        .size-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .size-btn {
          border: 1px solid #324039;
          border-radius: 10px;
          background: #17201b;
          color: #b7c6bd;
          padding: 10px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-weight: 700;
          font-size: 12px;
        }

        .size-btn.active {
          border-color: rgba(0, 200, 83, 0.7);
          background: rgba(0, 200, 83, 0.16);
          color: #90ffbd;
        }

        .submit-btn {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 12px;
          background: #00c853;
          color: #03210f;
          font-weight: 800;
          cursor: pointer;
          font-size: 14px;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
