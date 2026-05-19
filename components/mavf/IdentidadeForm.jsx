'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function IdentidadeForm({ onSave, onClose, onSuccess, encontroRef = '' }) {
  const [declaracao, setDeclaracao] = useState('');
  const [contexto, setContexto] = useState('');
  const [encontro, setEncontro] = useState(encontroRef || '');
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
        encontro_ref: encontro.trim()
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
          className="textarea"
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

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          {isSaving ? 'Registrando...' : 'Declarar Minha Identidade'}
        </button>
      </form>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: rgba(5, 5, 10, 0.76);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
        }

        .sheet {
          width: 100%;
          max-width: 580px;
          background: linear-gradient(180deg, #1b1726 0%, #14111c 100%);
          border: 1px solid #4a3f67;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 24px 52px rgba(0, 0, 0, 0.48);
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        h3 {
          margin: 0;
          color: #bba8ff;
          font-size: 18px;
        }

        .close-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #554877;
          background: #231d32;
          color: #cabef0;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        }

        .label {
          display: block;
          margin: 8px 0 6px;
          font-size: 12px;
          color: #c4b9e7;
          font-weight: 700;
        }

        .textarea,
        .input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #524673;
          background: #13101b;
          color: #f2efff;
          padding: 10px;
          font-family: inherit;
          font-size: 14px;
        }

        .textarea {
          min-height: 92px;
          resize: vertical;
        }

        .textarea:focus,
        .input:focus {
          outline: none;
          border-color: rgba(167, 139, 250, 0.8);
          box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.16);
        }

        .counter {
          margin-top: 4px;
          font-size: 11px;
          color: #988bb8;
          text-align: right;
        }

        .preview {
          margin-top: 10px;
          margin-bottom: 8px;
          border: 1px solid rgba(167, 139, 250, 0.4);
          border-radius: 10px;
          background: rgba(167, 139, 250, 0.1);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .preview-label {
          font-size: 11px;
          color: #b4a5d9;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .preview strong {
          font-size: 14px;
          color: #efe9ff;
          line-height: 1.4;
        }

        .submit-btn {
          width: 100%;
          margin-top: 12px;
          border: none;
          border-radius: 10px;
          padding: 12px;
          background: #a78bfa;
          color: #201241;
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
