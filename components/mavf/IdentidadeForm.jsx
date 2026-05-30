'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function IdentidadeForm({ onSave, onClose, onSuccess, encontroRef = '' }) {
  const [declaracao, setDeclaracao] = useState('');
  const [contexto, setContexto] = useState('');
  const [encontro, setEncontro] = useState(encontroRef || '');
  const [shareInFeed, setShareInFeed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const baseText = useMemo(() => declaracao.trim(), [declaracao]);
  const preview = baseText ? `Eu sou alguém que ${baseText}` : 'Eu sou alguém que…';
  const canSubmit = baseText.length > 0 && baseText.length <= 280 && !isSaving;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSaving(true);
      const payload = await onSave?.({
        declaracao: baseText,
        contexto: contexto.trim(),
        encontro_ref: encontro.trim(),
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
              sourceId: 'mavf-identity-form',
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
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar identidade');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Declaração de identidade">
      <form className="sheet" onSubmit={handleSubmit}>
        <div className="sheet-header">
          <h3>💎 Declaração de identidade</h3>
          <button type="button" className="close-btn" onClick={onClose} disabled={isSaving}>
            ×
          </button>
        </div>

        <label className="label" htmlFor="identity-text">Eu sou alguém que…</label>
        <textarea
          id="identity-text"
          className="textarea input"
          rows={4}
          value={declaracao}
          onChange={(event) => setDeclaracao(event.target.value)}
          placeholder="age antes de sentir vontade."
          maxLength={280}
        />

        <div className="counter">{baseText.length}/280</div>

        <div className="preview">
          <span className="preview-label">Prévia</span>
          <strong>{preview}</strong>
        </div>

        <label className="label" htmlFor="identity-context">Contexto (opcional)</label>
        <input
          id="identity-context"
          className="input"
          type="text"
          value={contexto}
          onChange={(event) => setContexto(event.target.value)}
          placeholder="O que te fez escrever isso agora?"
          maxLength={220}
        />

        <label className="label" htmlFor="identity-meeting">Encontro ref (opcional)</label>
        <input
          id="identity-meeting"
          className="input"
          type="text"
          value={encontro}
          onChange={(event) => setEncontro(event.target.value)}
          placeholder="Ex: Encontro 03"
          maxLength={60}
        />

        <label className="share-toggle">
          <input
            type="checkbox"
            checked={shareInFeed}
            onChange={(event) => setShareInFeed(event.target.checked)}
            disabled={isSaving}
          />
          <span>Compartilhar esta declaração no feed da comunidade</span>
        </label>

        <button type="submit" className="submit-btn btn-primary" disabled={!canSubmit}>
          {isSaving ? 'Registrando...' : 'Declarar Minha Identidade'}
        </button>
      </form>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: color-mix(in srgb, var(--bg) 76%, transparent);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
        }

        .sheet {
          width: 100%;
          max-width: 580px;
          background: var(--bg-card);
          border: 1px solid color-mix(in srgb, var(--purple) 38%, transparent);
          border-radius: var(--radius-lg);
          padding: 14px;
          box-shadow: var(--shadow-lg);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        h3 {
          margin: 0;
          color: var(--purple);
          font-family: var(--font-display);
          font-size: 18px;
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid color-mix(in srgb, var(--purple) 38%, transparent);
          background: color-mix(in srgb, var(--purple-dim) 30%, var(--bg-surface));
          color: var(--text-2);
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }

        .label {
          display: block;
          margin: 8px 0 6px;
          font-size: 11px;
          color: var(--text-3);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .textarea,
        .input {
          margin: 0;
        }

        .textarea {
          min-height: 92px;
          resize: vertical;
        }

        .textarea:focus,
        .input:focus {
          border-color: var(--purple);
          box-shadow: 0 0 0 3px var(--purple-dim);
        }

        .counter {
          margin-top: 4px;
          font-size: 11px;
          color: var(--text-3);
          text-align: right;
          font-family: var(--font-mono);
        }

        .preview {
          margin-top: 10px;
          margin-bottom: 8px;
          border: 1px solid color-mix(in srgb, var(--purple) 45%, transparent);
          border-radius: var(--radius-md);
          background: color-mix(in srgb, var(--purple) 12%, transparent);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .preview-label {
          font-size: 11px;
          color: var(--text-3);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .preview strong {
          font-size: 14px;
          color: var(--text);
          font-family: var(--font-display);
          font-weight: 700;
          line-height: 1.4;
        }

        .submit-btn {
          width: 100%;
          margin-top: 12px;
          padding: 12px;
          background: var(--purple);
          border-color: color-mix(in srgb, var(--purple) 55%, transparent);
          color: var(--bg);
          font-size: 14px;
        }

        .share-toggle {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.35;
          cursor: pointer;
        }

        .share-toggle input {
          appearance: none;
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          margin-top: 1px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg3);
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
          transition: var(--transition);
        }

        .share-toggle input:checked {
          border-color: var(--green);
          background: var(--green);
        }

        .share-toggle input:checked::after {
          content: '';
          position: absolute;
          left: 6px;
          top: 2px;
          width: 4px;
          height: 9px;
          border: solid var(--bg);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .share-toggle input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
