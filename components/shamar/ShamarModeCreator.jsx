'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ShamarCard } from '@/components/shamar/ShamarUI';
import { getSequentialMetaTotal, getSequentialSquareCount } from '@/src/lib/shamar/board-generator';
import { formatMoney } from '@/src/lib/shamar/formatters';

export const MODE_OPTIONS = [{ id: 'individual', icon: '🛡️', title: 'SHAMAR', shortTitle: 'SHAMAR' }];

export function modePath() {
  return '/shamar';
}

export function modeTitle() {
  return 'SHAMAR';
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function errorLabel(error) {
  const labels = {
    shamar_ja_criado: 'Você já tem um SHAMAR ativo. Encerre-o antes de iniciar uma nova meta.',
    modalidade_shamar_ja_criada: 'Você já tem um SHAMAR ativo.',
    meta_total_invalida: 'Informe uma meta válida.',
    duration_days_invalido: 'Escolha uma duração válida.',
    started_at_invalido: 'Escolha uma data de início válida.'
  };
  return labels[error] || error || 'Não foi possível criar o SHAMAR.';
}

export function ModeCards() {
  return null;
}

export function ShamarModeCreator({ onCreated, seasons = [] }) {
  const [name, setName] = useState('Minha reserva de segurança');
  const [metaTotal, setMetaTotal] = useState('125000');
  const [durationDays, setDurationDays] = useState('180');
  const [startedAt, setStartedAt] = useState(currentDate());
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState(false);
  const hasActiveSeason = seasons.length > 0;

  const preview = useMemo(() => {
    const requested = Number(String(metaTotal || '').replace(',', '.'));
    if (!Number.isFinite(requested) || requested <= 0) return null;
    return { squares: getSequentialSquareCount(requested), meta: getSequentialMetaTotal(requested) };
  }, [metaTotal]);

  const createShamar = async (event) => {
    event.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      const response = await fetch('/api/shamar/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'individual',
          name,
          meta_total: Number(String(metaTotal).replace(',', '.')),
          duration_days: Number(durationDays),
          started_at: startedAt
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'shamar_create_failed');
      setCreated(true);
      await onCreated?.();
    } catch (error) {
      setFormError(errorLabel(error?.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (hasActiveSeason || created) {
    return (
      <ShamarCard title="Seu SHAMAR está pronto">
        <div className="creator-success">
          <p>Sua meta está ativa. Agora, cada aporte transforma intenção em segurança.</p>
          <Link href="/shamar">Ver meu SHAMAR</Link>
        </div>
        <CreatorStyles />
      </ShamarCard>
    );
  }

  return (
    <ShamarCard title="Defina sua meta">
      <form className="creator-form" onSubmit={createShamar}>
        <label>
          <span>Nome da meta</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
        </label>
        <div className="creator-row">
          <label>
            <span>Quanto você quer guardar?</span>
            <input type="number" min="1" step="0.01" value={metaTotal} onChange={(event) => setMetaTotal(event.target.value)} required />
          </label>
          <label>
            <span>Prazo</span>
            <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)}>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">365 dias</option>
            </select>
          </label>
        </div>
        <label>
          <span>Data de início</span>
          <input type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required />
        </label>
        {preview ? <p className="creator-preview">Sua meta será ajustada para {formatMoney(preview.meta)} em {preview.squares} pequenos marcos.</p> : null}
        {formError ? <p className="creator-error">{formError}</p> : null}
        <button type="submit" disabled={isSaving}>{isSaving ? 'Criando...' : 'CRIAR MINHA META'}</button>
      </form>
      <CreatorStyles />
    </ShamarCard>
  );
}

function CreatorStyles() {
  return <style jsx global>{`
    .creator-form, .creator-success { display: grid; gap: 14px; }
    .creator-row { display: grid; grid-template-columns: 1fr 150px; gap: 12px; }
    .creator-form label { display: grid; gap: 6px; color: var(--text2); font-size: 12px; font-weight: 800; }
    .creator-form input, .creator-form select { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-input); color: var(--text); padding: 13px; font: inherit; outline: none; }
    .creator-form input:focus, .creator-form select:focus { border-color: var(--shamar-dark); box-shadow: 0 0 0 3px var(--shamar-dim); }
    .creator-form button, .creator-success a { border: 0; border-radius: var(--radius-md); background: var(--shamar-dark); color: white; font-weight: 900; padding: 15px 18px; text-align: center; }
    .creator-form button:disabled { opacity: .6; }
    .creator-preview, .creator-success p { margin: 0; color: var(--text2); font-size: 13px; line-height: 1.55; }
    .creator-error { margin: 0; color: var(--red); font-size: 12px; font-weight: 800; }
    @media (max-width: 560px) { .creator-row { grid-template-columns: 1fr; } }
  `}</style>;
}
