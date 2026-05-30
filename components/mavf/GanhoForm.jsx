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
  const [shareInFeed, setShareInFeed] = useState(false);
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
        tamanho,
        share_in_feed: shareInFeed
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
          className="textarea input"
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
                className={`size-btn badge badge-neutral ${active ? 'active' : ''}`}
                onClick={() => setTamanho(option.key)}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        <label className="share-toggle">
          <input
            type="checkbox"
            checked={shareInFeed}
            onChange={(event) => setShareInFeed(event.target.checked)}
            disabled={isSaving}
          />
          <span>Compartilhar este ganho no feed da comunidade</span>
        </label>

        <button type="submit" className="submit-btn btn-primary" disabled={!canSubmit}>
          {isSaving ? 'Registrando...' : 'Registrar Ganho'}
        </button>
      </form>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: color-mix(in srgb, var(--bg) 78%, transparent);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
        }

        .sheet {
          width: 100%;
          max-width: 560px;
          background: var(--bg-card);
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          padding: 14px;
          box-shadow: var(--shadow-lg);
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
          color: var(--green);
          font-family: var(--font-display);
          font-size: 18px;
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-2);
          background: var(--bg-surface);
          color: var(--text-2);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        .subtitle {
          margin: 0 0 12px;
          color: var(--text-2);
          font-size: 13px;
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

        .textarea {
          margin-bottom: 10px;
        }

        .textarea:focus {
          border-color: var(--green-mid);
          box-shadow: 0 0 0 3px var(--green-dim);
        }

        .size-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .size-btn {
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
          border-color: var(--green-mid);
          background: var(--green-dim);
          color: var(--green);
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          font-size: 14px;
        }

        .share-toggle {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 2px;
          color: var(--text-2);
          font-size: 12px;
          line-height: 1.4;
          cursor: pointer;
        }

        .share-toggle input {
          margin-top: 2px;
          accent-color: var(--green);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
