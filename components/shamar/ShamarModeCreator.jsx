'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ShamarCard } from '@/components/shamar/ShamarUI';
import { getSequentialMetaTotal, getSequentialSquareCount } from '@/src/lib/shamar/board-generator';
import { formatMoney } from '@/src/lib/shamar/formatters';

export const MODE_OPTIONS = [
  {
    id: 'individual',
    icon: '🛡️',
    title: 'Individual',
    shortTitle: 'Eu',
    subtitle: 'Seu SHAMAR individual, com seus quadrinhos e aportes.'
  },
  {
    id: 'dupla',
    icon: '🤝',
    title: 'Dupla',
    shortTitle: 'Dupla',
    subtitle: 'Exatamente 2 pessoas, cada uma com o proprio tabuleiro.'
  },
  {
    id: 'tribo',
    icon: '👥',
    title: 'Tribo',
    shortTitle: 'Tribo',
    subtitle: '3 ou mais pessoas somando resultados sem misturar controles.'
  }
];

export function modePath(mode) {
  if (mode === 'dupla') return '/shamar/dupla';
  if (mode === 'tribo') return '/shamar/tribo';
  return '/shamar/individual';
}

export function modeTitle(mode) {
  return MODE_OPTIONS.find((item) => item.id === mode)?.title || 'SHAMAR';
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function errorLabel(error) {
  const labels = {
    dupla_exige_um_convite: 'Informe exatamente 1 email para criar uma Dupla.',
    tribo_exige_minimo_tres_participantes: 'Informe pelo menos 2 emails para criar uma Tribo com 3 ou mais participantes.',
    convite_para_si_mesmo_invalido: 'Você não precisa convidar seu próprio email.',
    modalidade_shamar_ja_criada: 'Você já tem um SHAMAR ativo nessa modalidade. Finalize antes de iniciar outro.',
    meta_total_invalida: 'Informe uma meta válida.',
    duration_days_invalido: 'Escolha uma duração válida.',
    started_at_invalido: 'Escolha uma data de início válida.',
    shamar_invites_create_failed: 'Não foi possível registrar os convites.'
  };

  return labels[error] || error || 'Não foi possível criar o SHAMAR.';
}

function activeModesFromSeasons(seasons) {
  return new Set((seasons || []).map((item) => item.mode || item.config?.mode || 'individual'));
}

export function ModeCards({ seasons = [], activeMode = 'individual', onSelect }) {
  const activeModes = activeModesFromSeasons(seasons);

  return (
    <section className="mode-grid" aria-label="Modalidades SHAMAR">
      {MODE_OPTIONS.map((mode) => {
        const hasSeason = activeModes.has(mode.id);
        const active = activeMode === mode.id;
        return (
          <button
            type="button"
            className={`mode-card${active ? ' active' : ''}`}
            key={mode.id}
            onClick={() => onSelect?.(mode.id)}
          >
            <div className="mode-icon">{mode.icon}</div>
            <div>
              <strong>{mode.title}</strong>
              <p>{mode.subtitle}</p>
              <span>{hasSeason ? 'Ativo' : 'Disponível'}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}

export function ShamarModeCreator({ onCreated, seasons = [], initialMode = 'individual' }) {
  const [mode, setMode] = useState(initialMode || 'individual');
  const [name, setName] = useState('');
  const [metaTotal, setMetaTotal] = useState('125000');
  const [durationDays, setDurationDays] = useState('180');
  const [startedAt, setStartedAt] = useState(currentDate());
  const [inviteEmails, setInviteEmails] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);

  const activeModes = useMemo(() => activeModesFromSeasons(seasons), [seasons]);
  const selectedMode = MODE_OPTIONS.find((item) => item.id === mode) || MODE_OPTIONS[0];
  const modeAlreadyActive = activeModes.has(mode);
  const allModesActive = MODE_OPTIONS.every((item) => activeModes.has(item.id));

  useEffect(() => {
    if (initialMode && MODE_OPTIONS.some((item) => item.id === initialMode)) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const adjustedPreview = useMemo(() => {
    const requested = Number(String(metaTotal || '').replace(',', '.'));
    if (!Number.isFinite(requested) || requested <= 0) return null;
    return {
      squares: getSequentialSquareCount(requested),
      meta: getSequentialMetaTotal(requested)
    };
  }, [metaTotal]);

  const inviteHelp = mode === 'dupla'
    ? 'Convide 1 pessoa pelo email. Se ela ainda não usa o ZeroApp, receberá o caminho de cadastro e aceite.'
    : mode === 'tribo'
      ? 'Convide pelo menos 2 emails. Cada participante terá seu proprio SHAMAR após aceitar.'
      : 'Sem convite: este SHAMAR é só seu.';

  const createMode = async (event) => {
    event.preventDefault();
    if (modeAlreadyActive) {
      setFormError(errorLabel('modalidade_shamar_ja_criada'));
      return;
    }

    setIsSaving(true);
    setMessage('');
    setFormError('');
    setCreatedResult(null);

    try {
      const response = await fetch('/api/shamar/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          name,
          meta_total: Number(String(metaTotal).replace(',', '.')),
          duration_days: Number(durationDays),
          started_at: startedAt,
          invite_emails: inviteEmails
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'shamar_create_failed');

      const inviteCount = Array.isArray(payload?.invites) ? payload.invites.length : 0;
      setCreatedResult(payload);
      setMessage(
        inviteCount > 0
          ? `${selectedMode.title} criado. ${inviteCount} convite(s) ficaram pendentes de aceite.`
          : `${selectedMode.title} criado com sucesso.`
      );
      setName('');
      setInviteEmails('');
      await onCreated?.();
    } catch (error) {
      setFormError(errorLabel(error?.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShamarCard title="Criar SHAMAR">
      <ModeCards seasons={seasons} activeMode={mode} onSelect={setMode} />
      <form className="mode-form" onSubmit={createMode}>
        <div className="mode-selector" role="tablist" aria-label="Tipo de SHAMAR">
          {MODE_OPTIONS.map((item) => {
            const disabled = activeModes.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? 'selected' : ''}
                onClick={() => setMode(item.id)}
                disabled={disabled}
              >
                <span>{item.icon}</span>
                {item.shortTitle}
                {disabled ? <em>Ativo</em> : null}
              </button>
            );
          })}
        </div>

        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={`${selectedMode.title} SHAMAR`} />
        </label>

        <div className="mode-form-row">
          <label>
            Meta
            <input value={metaTotal} onChange={(event) => setMetaTotal(event.target.value)} inputMode="decimal" required />
          </label>
          <label>
            Duração
            <select value={durationDays} onChange={(event) => setDurationDays(event.target.value)}>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">365 dias</option>
            </select>
          </label>
        </div>

        <label>
          Início
          <input type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required />
        </label>

        {mode !== 'individual' ? (
          <label>
            Convites por email
            <textarea
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
              placeholder={mode === 'dupla' ? 'email@exemplo.com' : 'email1@exemplo.com, email2@exemplo.com'}
              rows={3}
            />
          </label>
        ) : null}

        {adjustedPreview ? (
          <p className="mode-help">
            A meta será ajustada para {formatMoney(adjustedPreview.meta)} com {adjustedPreview.squares} quadrinhos sequenciais.
          </p>
        ) : null}
        <p className="mode-help">{inviteHelp}</p>
        {modeAlreadyActive ? <p className="mode-error">{errorLabel('modalidade_shamar_ja_criada')}</p> : null}
        {allModesActive ? <p className="mode-help">Você já tem um SHAMAR ativo em cada modalidade.</p> : null}
        {formError ? <p className="mode-error">{formError}</p> : null}
        {message ? <p className="mode-success">{message}</p> : null}

        {createdResult ? (
          <div className="created-box">
            <strong>Criação confirmada</strong>
            <span>Seu tabuleiro já está disponível. Convidados só entram depois de cadastro, aprovação e aceite.</span>
            {(createdResult.invites || []).length > 0 ? (
              <div className="created-invites">
                {createdResult.invites.map((invite) => (
                  <div key={invite.id || invite.email}>
                    <span>{invite.email}</span>
                    <strong>{invite.email_sent ? 'Email enviado' : invite.email_error || 'Email pendente'}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            <Link href={modePath(createdResult.mode || mode)}>Ver meu SHAMAR</Link>
          </div>
        ) : null}

        <button className="mode-submit" type="submit" disabled={isSaving || modeAlreadyActive || allModesActive}>
          {isSaving ? 'Criando...' : `Criar ${selectedMode.title}`}
        </button>
      </form>
      <ShamarModeCreatorStyles />
    </ShamarCard>
  );
}

export function ShamarModeCreatorStyles() {
  return (
    <style jsx global>{`
      .mode-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }

      .mode-card {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--bg2);
        color: inherit;
        padding: 12px;
        display: grid;
        gap: 8px;
        min-height: 144px;
        text-align: left;
        cursor: pointer;
      }

      .mode-card.active {
        border-color: var(--shamar-dark);
        background: var(--shamar-dim);
      }

      .mode-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 1px solid var(--border);
        font-size: 20px;
      }

      .mode-card strong {
        display: block;
        color: var(--text);
        font-size: 14px;
        font-weight: 900;
        margin-bottom: 4px;
      }

      .mode-card p {
        margin: 0;
        min-height: 48px;
        color: var(--text2);
        font-size: 11px;
        line-height: 1.45;
      }

      .mode-card span {
        display: block;
        color: var(--shamar-dark);
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-top: 8px;
      }

      .mode-form {
        display: grid;
        gap: 12px;
      }

      .mode-selector {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .mode-selector button {
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--bg-input);
        color: var(--text2);
        font-weight: 900;
        padding: 11px 8px;
      }

      .mode-selector button.selected {
        border-color: var(--shamar-dark);
        background: var(--shamar-dark);
        color: white;
      }

      .mode-selector button:disabled {
        opacity: 0.56;
        cursor: not-allowed;
      }

      .mode-selector span {
        display: block;
        font-size: 18px;
        line-height: 1;
        margin-bottom: 4px;
      }

      .mode-selector em {
        display: block;
        font-size: 9px;
        font-style: normal;
        margin-top: 3px;
      }

      .mode-form label {
        display: grid;
        gap: 6px;
        color: var(--text2);
        font-size: 12px;
        font-weight: 800;
      }

      .mode-form input,
      .mode-form select,
      .mode-form textarea {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--bg-input);
        color: var(--text);
        padding: 12px 13px;
        outline: none;
        font: inherit;
      }

      .mode-form textarea {
        resize: vertical;
      }

      .mode-form-row {
        display: grid;
        grid-template-columns: 1fr 130px;
        gap: 10px;
      }

      .mode-help,
      .mode-error,
      .mode-success {
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
      }

      .mode-help {
        color: var(--text3);
      }

      .mode-error {
        color: var(--red);
        font-weight: 800;
      }

      .mode-success {
        color: var(--shamar-dark);
        font-weight: 800;
      }

      .mode-submit,
      .created-box a {
        border: 0;
        border-radius: var(--radius-md);
        background: var(--shamar-dark);
        color: white;
        font-weight: 900;
        padding: 14px 16px;
        text-align: center;
      }

      .mode-submit:disabled {
        opacity: 0.65;
      }

      .created-box {
        display: grid;
        gap: 10px;
        border: 1px solid rgba(27, 94, 32, 0.18);
        border-radius: 12px;
        background: var(--shamar-dim);
        padding: 12px;
      }

      .created-box > strong {
        color: var(--shamar-dark);
        font-size: 13px;
        font-weight: 900;
      }

      .created-box > span {
        color: var(--text2);
        font-size: 12px;
        line-height: 1.5;
      }

      .created-invites {
        display: grid;
        gap: 6px;
      }

      .created-invites div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border-top: 1px solid rgba(27, 94, 32, 0.14);
        padding-top: 6px;
      }

      .created-invites span,
      .created-invites strong {
        font-size: 11px;
      }

      .created-invites span {
        color: var(--text2);
      }

      .created-invites strong {
        color: var(--shamar-dark);
      }

      @media (max-width: 560px) {
        .mode-grid {
          grid-template-columns: 1fr;
        }

        .mode-card {
          min-height: auto;
          grid-template-columns: 42px 1fr;
          align-items: center;
        }

        .mode-card p {
          min-height: auto;
        }

        .mode-form-row {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
