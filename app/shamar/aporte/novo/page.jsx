'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CoinAnimation } from '@/components/gamification/CoinAnimation';
import {
  BoardGrid,
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { useShamarBoard } from '@/hooks/useShamarBoard';
import { getBrowserSupabase } from '@/src/lib/supabase/browser';
import { formatMoney, todayInputValue } from '@/src/lib/shamar/formatters';

const TOLERANCE = 1;

function parseAmount(value) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
}

export default function NewShamarContributionPage() {
  const router = useRouter();
  const { season, config, locked, unlockProgress, error, isLoading, refresh } = useShamar();
  const { squares, isLoading: isBoardLoading, refresh: refreshBoard } = useShamarBoard(season?.id);
  const [amountInput, setAmountInput] = useState('');
  const [contributedAt, setContributedAt] = useState(todayInputValue());
  const [observation, setObservation] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [proof, setProof] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coinAmount, setCoinAmount] = useState(0);

  const amount = parseAmount(amountInput);
  const availableSquares = useMemo(() => (squares || []).filter((square) => !square.marked), [squares]);
  const selectedSquares = useMemo(() => {
    const selected = new Set(selectedIds);
    return availableSquares.filter((square) => selected.has(square.id));
  }, [availableSquares, selectedIds]);
  const selectedSum = selectedSquares.reduce((sum, square) => sum + Number(square.value || 0), 0);
  const diff = Math.round((amount - selectedSum) * 100) / 100;
  const valuesMatch = amount > 0 && Math.abs(diff) <= TOLERANCE;
  const diffLabel = diff >= 0 ? `Faltam ${formatMoney(diff)}` : `Excedeu ${formatMoney(Math.abs(diff))}`;
  const isFutureDate = contributedAt > todayInputValue();
  const canSubmit = Boolean(season?.id && amount > 0 && contributedAt && !isFutureDate && proof?.path && valuesMatch && !isSubmitting);

  const toggleSquare = (square) => {
    if (square.marked) return;
    setSelectedIds((prev) => (prev.includes(square.id) ? prev.filter((id) => id !== square.id) : [...prev, square.id]));
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const signedRes = await fetch('/api/shamar/proof-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type
        })
      });
      const signedData = await signedRes.json().catch(() => ({}));
      if (!signedRes.ok) throw new Error(signedData?.error || 'signed_upload_failed');

      const supabase = getBrowserSupabase();
      const { error: uploadError } = await supabase.storage
        .from('shamar-provas')
        .uploadToSignedUrl(signedData.path, signedData.token, file, {
          contentType: file.type
        });

      if (uploadError) throw new Error(uploadError.message || 'proof_upload_failed');

      setProof({
        path: signedData.path,
        filename: file.name,
        content_type: file.type
      });
      toast.success('Comprovante anexado');
    } catch (uploadError) {
      setProof(null);
      toast.error(uploadError?.message || 'Não foi possível anexar o comprovante');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/shamar/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: season.id,
          amount,
          contributed_at: contributedAt,
          observation,
          proof_url: proof.path,
          square_ids: selectedIds
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'contribution_create_failed');

      toast.success('Aporte registrado! 🛡️');
      if (data?.zero_coins?.awarded) {
        setCoinAmount(50);
        window.dispatchEvent(new Event('zero:coins-updated'));
      }
      await Promise.allSettled([refresh(), refreshBoard()]);
      setTimeout(() => router.push('/shamar'), 900);
    } catch (submitError) {
      toast.error(submitError?.message || 'Não foi possível registrar o aporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  return (
    <ShamarShell activeTab="shamar">
      {coinAmount ? <CoinAnimation amount={coinAmount} onComplete={() => setCoinAmount(0)} /> : null}
      <ShamarHeader
        hrefBack="/shamar"
        label="Aporte SHAMAR"
        title="+ Registrar Aporte"
        subtitle="Sem comprovante, não conta."
        stats={[
          { label: 'Turma', value: config?.turma || '—' },
          { label: 'Meta', value: formatMoney(config?.meta_total || 0, { compact: true }) },
          { label: 'Status', value: proof?.path ? 'OK' : 'Pendente' }
        ]}
      />

      <form onSubmit={handleSubmit}>
        <ShamarCard title="Dados do aporte">
          <div className="aporte-form-grid">
            <label>
              <span>Valor</span>
              <input
                className="aporte-input aporte-money"
                type="number"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="0,00"
              />
            </label>
            <label>
              <span>Data</span>
              <input
                className="aporte-input"
                type="date"
                value={contributedAt}
                max={todayInputValue()}
                onChange={(event) => setContributedAt(event.target.value)}
              />
            </label>
            <label className="full">
              <span>Observação</span>
              <input
                className="aporte-input"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
        </ShamarCard>

        <ShamarCard title="Comprovante bancário">
          <label className={`proof-zone${proof?.path ? ' done' : ''}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} disabled={isUploading} />
            {proof?.path ? (
              <>
                <strong>✓ {proof.filename}</strong>
                <span>Comprovante anexado</span>
              </>
            ) : (
              <>
                <strong>📎 Toque para anexar</strong>
                <span>{isUploading ? 'Enviando...' : 'JPG, PNG, WebP ou PDF · OBRIGATÓRIO'}</span>
              </>
            )}
          </label>
        </ShamarCard>

        <ShamarCard title={`Selecione os quadrinhos · total deve ser ${formatMoney(amount)}`}>
          <div className="selection-counter">
            <strong>{formatMoney(selectedSum)} de {formatMoney(amount)}</strong>
            {valuesMatch ? <span className="ok">✓ Valores conferem</span> : <span className="warn">{diffLabel}</span>}
          </div>
          {isBoardLoading ? (
            <p className="aporte-muted">Carregando quadrinhos...</p>
          ) : availableSquares.length > 0 ? (
            <BoardGrid squares={squares} selectable selectedIds={selectedIds} onToggleSquare={toggleSquare} />
          ) : (
            <p className="aporte-muted">Nenhum quadrinho disponível para esta temporada.</p>
          )}
        </ShamarCard>

        <button type="submit" className="aporte-submit" disabled={!canSubmit}>
          {isSubmitting ? 'Confirmando...' : 'Confirmar Aporte 🛡️'}
        </button>
        <p className="aporte-phrase">Você escolheu guardar antes de gastar.</p>
      </form>

      <style jsx>{`
        .aporte-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        label.full {
          grid-column: 1 / -1;
        }

        label span {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          margin-bottom: 6px;
        }

        .aporte-input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text);
          padding: 12px 14px;
          outline: none;
        }

        .aporte-input:focus {
          border-color: var(--shamar-dark);
          box-shadow: 0 0 0 3px var(--shamar-dim);
        }

        .aporte-money {
          background: var(--shamar-dim);
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 900;
        }

        .proof-zone {
          position: relative;
          min-height: 132px;
          border: 2px dashed var(--border-green);
          border-radius: var(--radius-md);
          background: var(--shamar-dim);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          cursor: pointer;
          padding: 18px;
        }

        .proof-zone.done {
          border-style: solid;
          border-color: var(--shamar-dark);
          background: var(--green-dim);
        }

        .proof-zone input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .proof-zone strong {
          color: var(--shamar-dark);
          font-weight: 900;
        }

        .proof-zone span,
        .aporte-muted,
        .aporte-phrase {
          color: var(--text2);
          font-size: 12px;
          line-height: 1.5;
        }

        .selection-counter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .selection-counter strong {
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 14px;
        }

        .selection-counter span {
          border-radius: var(--radius-full);
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .selection-counter .ok {
          background: var(--green-dim);
          color: var(--shamar-dark);
        }

        .selection-counter .warn {
          background: var(--red-dim);
          color: var(--red);
        }

        .aporte-submit {
          width: 100%;
          border: 0;
          border-radius: var(--radius-md);
          background: var(--shamar-dark);
          color: white;
          font-size: 14px;
          font-weight: 900;
          padding: 14px 18px;
          cursor: pointer;
        }

        .aporte-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .aporte-phrase {
          text-align: center;
          margin: 10px 0 0;
        }

        @media (max-width: 560px) {
          .aporte-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
