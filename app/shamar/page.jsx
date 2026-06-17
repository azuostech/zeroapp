'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { MODE_OPTIONS, modePath } from '@/components/shamar/ShamarModeCreator';
import { useShamar } from '@/hooks/useShamar';
import { formatMoney } from '@/src/lib/shamar/formatters';

function statusLabel({ hasSeason, pendingCount }) {
  if (hasSeason) return 'Ativo';
  if (pendingCount > 0) return 'Aguardando aceite';
  return 'Livre para criar';
}

function inviteModeLabel(mode) {
  if (mode === 'dupla') return 'Dupla';
  if (mode === 'tribo') return 'Tribo';
  return 'SHAMAR';
}

export default function ShamarHubPage() {
  const { seasons, locked, unlockProgress, error, isLoading, refresh } = useShamar();
  const [invites, setInvites] = useState({ incoming: [], outgoing: [] });
  const [invitesError, setInvitesError] = useState('');
  const [resendingInviteId, setResendingInviteId] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/shamar/invites', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'shamar_invites_fetch_failed');
      setInvites({
        incoming: Array.isArray(data?.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data?.outgoing) ? data.outgoing : []
      });
      setInvitesError('');
    } catch (fetchError) {
      setInvites({ incoming: [], outgoing: [] });
      setInvitesError(fetchError?.message || 'shamar_invites_fetch_failed');
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const resendInvite = async (inviteId) => {
    setResendingInviteId(inviteId);
    setInviteNotice('');

    try {
      const res = await fetch('/api/shamar/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', invite_id: inviteId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'shamar_invite_resend_failed');
      setInviteNotice('Convite reenviado.');
      await loadInvites();
    } catch (resendError) {
      setInviteNotice(resendError?.message || 'Não foi possível reenviar o convite.');
      await loadInvites();
    } finally {
      setResendingInviteId('');
    }
  };

  const seasonsByMode = useMemo(() => {
    return new Map((seasons || []).map((season) => [season.mode || season.config?.mode || 'individual', season]));
  }, [seasons]);

  const pendingOutgoingByMode = useMemo(() => {
    const map = new Map();
    for (const invite of invites.outgoing || []) {
      if (invite.status !== 'pending') continue;
      const mode = invite.mode || invite.config?.mode;
      map.set(mode, Number(map.get(mode) || 0) + 1);
    }
    return map;
  }, [invites.outgoing]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  const activeCount = seasonsByMode.size;
  const pendingIncoming = invites.incoming?.length || 0;

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        label="Jornada do aluno"
        title="SHAMAR"
        subtitle="Escolha uma modalidade para acompanhar ou crie uma nova jornada."
        stats={[
          { label: 'Modalidades ativas', value: `${activeCount}/3` },
          { label: 'Convites', value: pendingIncoming },
          { label: 'Controle', value: 'Individual' }
        ]}
      />

      <ShamarCard
        title="Minhas modalidades"
        action={<Link className="hub-card-action" href="/shamar/criar">Criar</Link>}
      >
        <div className="hub-mode-list">
          {MODE_OPTIONS.map((mode) => {
            const season = seasonsByMode.get(mode.id);
            const pendingCount = Number(pendingOutgoingByMode.get(mode.id) || 0);
            const href = season ? modePath(mode.id) : `/shamar/criar?mode=${encodeURIComponent(mode.id)}`;
            const meta = season?.config?.meta_total;

            return (
              <Link href={href} className={`hub-mode-row${season ? ' active' : ''}`} key={mode.id}>
                <span className="hub-mode-icon">{mode.icon}</span>
                <div>
                  <strong>SHAMAR {mode.title}</strong>
                  <em>{statusLabel({ hasSeason: Boolean(season), pendingCount })}</em>
                  {season?.config ? <small>Meta {formatMoney(meta || 0, { compact: true })}</small> : null}
                </div>
                <b>{season ? 'Ver' : 'Criar'}</b>
              </Link>
            );
          })}
        </div>
      </ShamarCard>

      {invites.incoming?.length > 0 ? (
        <ShamarCard title="Convites recebidos">
          <div className="hub-invite-list">
            {invites.incoming.map((invite) => (
              <Link href={`/shamar/convites?token=${encodeURIComponent(invite.token)}`} className="hub-invite-row" key={invite.id}>
                <div>
                  <strong>{inviteModeLabel(invite.mode)}</strong>
                  <span>{invite.inviter?.name || 'Alguém'} convidou você para construir patrimônio junto.</span>
                </div>
                <b>Aceitar</b>
              </Link>
            ))}
          </div>
        </ShamarCard>
      ) : null}

      <ShamarCard title="Convites enviados">
        {invitesError ? <p className="hub-muted">{invitesError}</p> : null}
        {inviteNotice ? <p className="hub-notice">{inviteNotice}</p> : null}
        {!invitesError && invites.outgoing?.length === 0 ? (
          <p className="hub-muted">Nenhum convite enviado ainda.</p>
        ) : null}
        {!invitesError && invites.outgoing?.length > 0 ? (
          <div className="hub-outgoing-list">
            {invites.outgoing.slice(0, 6).map((invite) => (
              <div className="hub-outgoing-row" key={invite.id}>
                <div>
                  <strong>{invite.invited_email}</strong>
                  <span>{inviteModeLabel(invite.mode)} · {invite.status === 'accepted' ? 'Aceito' : 'Pendente'}</span>
                </div>
                <div className="hub-outgoing-actions">
                  <b className={invite.email_sent ? 'sent' : 'failed'}>
                    {invite.email_sent ? 'Enviado' : invite.email_error || 'Falhou'}
                  </b>
                  {invite.status === 'pending' ? (
                    <button type="button" onClick={() => resendInvite(invite.id)} disabled={resendingInviteId === invite.id}>
                      {resendingInviteId === invite.id ? 'Enviando...' : 'Reenviar'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </ShamarCard>

      <button type="button" className="hub-refresh" onClick={() => {
        refresh();
        loadInvites();
      }}>
        Atualizar SHAMAR
      </button>

      <style jsx global>{`
        .hub-card-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 84px;
          border-radius: 999px;
          background: var(--shamar-dark);
          font-size: 13px;
          font-weight: 900;
          padding: 9px 14px;
          text-align: center;
          color: white;
        }

        .hub-mode-list,
        .hub-invite-list,
        .hub-outgoing-list {
          display: grid;
          gap: 10px;
        }

        .hub-mode-list {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
        }

        .hub-mode-row,
        .hub-invite-row,
        .hub-outgoing-row {
          display: grid;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
          padding: 12px;
        }

        .hub-mode-row {
          min-height: 172px;
          grid-template-columns: 1fr;
          justify-items: center;
          align-content: center;
          text-align: center;
        }

        .hub-invite-row,
        .hub-outgoing-row {
          grid-template-columns: 1fr auto;
        }

        .hub-mode-row.active {
          border-color: rgba(27, 94, 32, 0.22);
          background: var(--shamar-dim);
        }

        .hub-mode-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: white;
          font-size: 20px;
        }

        .hub-mode-row > div {
          display: grid;
          justify-items: center;
          gap: 5px;
        }

        .hub-mode-row strong,
        .hub-invite-row strong,
        .hub-outgoing-row strong {
          display: block;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.2;
        }

        .hub-mode-row em,
        .hub-invite-row span,
        .hub-outgoing-row span,
        .hub-muted,
        .hub-notice {
          display: block;
          color: var(--text3);
          font-size: 11px;
          font-style: normal;
          line-height: 1.45;
          margin: 0;
        }

        .hub-mode-row em,
        .hub-mode-row small {
          border-radius: 999px;
          padding: 4px 8px;
          font-style: normal;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.1;
        }

        .hub-mode-row em {
          background: var(--shamar-dim);
          color: var(--shamar-dark);
        }

        .hub-mode-row small {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text2);
        }

        .hub-mode-row b,
        .hub-invite-row b {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 76px;
          border-radius: 999px;
          background: var(--shamar-dark);
          font-size: 12px;
          font-weight: 900;
          padding: 8px 12px;
          color: white;
        }

        .hub-outgoing-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .hub-outgoing-row b,
        .hub-outgoing-actions button {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 900;
        }

        .hub-outgoing-actions button {
          border: 1px solid var(--shamar-dark);
          background: var(--shamar-dark);
          color: white;
          cursor: pointer;
        }

        .hub-outgoing-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hub-outgoing-row b.sent {
          background: var(--shamar-dim);
          color: var(--shamar-dark);
        }

        .hub-outgoing-row b.failed {
          background: rgba(229, 57, 53, 0.1);
          color: var(--red);
        }

        .hub-notice {
          border-radius: 10px;
          background: var(--shamar-dim);
          color: var(--shamar-dark);
          font-weight: 900;
          padding: 9px 10px;
          margin-bottom: 10px;
        }

        .hub-refresh {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          color: var(--text2);
          font-weight: 900;
          padding: 12px 14px;
          margin-bottom: 14px;
        }

        @media (max-width: 760px) {
          .hub-mode-list {
            grid-template-columns: 1fr;
          }

          .hub-mode-row {
            min-height: 0;
          }

          .hub-outgoing-row,
          .hub-invite-row {
            grid-template-columns: 1fr;
          }

          .hub-outgoing-actions {
            justify-content: center;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
