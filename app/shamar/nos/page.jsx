'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { formatMoney, identityLabel } from '@/src/lib/shamar/formatters';

function PersonCard({ title, person }) {
  const fallbackName = title === 'Você' ? 'Seu SHAMAR' : 'Aguardando aceite';

  return (
    <div className="nos-person">
      <div className="nos-avatar">{person?.avatar || '?'}</div>
      <div className="nos-person-head">
        <span>{title}</span>
        <strong>{person?.name || fallbackName}</strong>
      </div>
      <dl className="nos-metrics">
        <div><dt>Patrimônio</dt><dd>{formatMoney(person?.patrimonio || 0)}</dd></div>
        <div><dt>Quadrinhos</dt><dd>{Number(person?.squares_marked || 0)}</dd></div>
        <div><dt>Sequência</dt><dd>{Number(person?.weeks || 0)} semanas</dd></div>
        <div><dt>Identidade</dt><dd>{identityLabel(person?.identity_level)}</dd></div>
      </dl>
    </div>
  );
}

export default function ShamarNosPage() {
  const { season, locked, unlockProgress, error, isLoading } = useShamar('dupla');
  const [data, setData] = useState(null);
  const [nosError, setNosError] = useState(null);
  const [isNosLoading, setIsNosLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteNotice, setInviteNotice] = useState('');
  const [resendingInviteId, setResendingInviteId] = useState('');
  const [copyingInviteId, setCopyingInviteId] = useState('');

  useEffect(() => {
    let active = true;

    const loadDupla = async () => {
      if (!season?.id) return;
      setIsNosLoading(true);
      setNosError(null);

      try {
        const nosRes = await fetch(`/api/shamar/nos?season_id=${encodeURIComponent(season.id)}`, { cache: 'no-store' });
        const payload = await nosRes.json().catch(() => ({}));
        if (!nosRes.ok) throw new Error(payload?.error || 'shamar_nos_fetch_failed');

        const invitesRes = await fetch('/api/shamar/invites', { cache: 'no-store' });
        const invitesPayload = await invitesRes.json().catch(() => ({}));

        const outgoing = invitesRes.ok && Array.isArray(invitesPayload?.outgoing) ? invitesPayload.outgoing : [];
        const nextInvites = outgoing.filter((invite) => {
          const sameMode = invite.mode === 'dupla' || invite.config?.mode === 'dupla';
          const sameConfig = !invite.config?.id || invite.config.id === season.tribo_config_id;
          return sameMode && sameConfig && invite.status === 'pending';
        });

        if (active) {
          setData(payload);
          setPendingInvites(nextInvites);
        }
      } catch (fetchError) {
        if (active) {
          setData(null);
          setPendingInvites([]);
          setNosError(fetchError?.message || 'shamar_nos_fetch_failed');
        }
      } finally {
        if (active) setIsNosLoading(false);
      }
    };

    loadDupla();
    return () => {
      active = false;
    };
  }, [season?.id, season?.tribo_config_id]);

  const resendInvite = async (inviteId) => {
    setResendingInviteId(inviteId);
    setInviteNotice('');

    try {
      const res = await fetch('/api/shamar/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', invite_id: inviteId })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'shamar_invite_resend_failed');
      setInviteNotice('Email reenviado para o convite pendente.');
    } catch (resendError) {
      setInviteNotice(resendError?.message || 'Não foi possível reenviar o email.');
    } finally {
      setResendingInviteId('');
    }
  };

  const copyInviteLink = async (invite) => {
    if (!invite?.token) {
      setInviteNotice('Link indisponível para este convite. Reenvie o email ou crie um novo convite.');
      return;
    }

    setCopyingInviteId(invite.id);
    setInviteNotice('');

    try {
      const link = new URL(`/shamar/convites?token=${encodeURIComponent(invite.token)}`, window.location.origin).toString();
      await navigator.clipboard.writeText(link);
      setInviteNotice('Link copiado. Agora você pode enviar direto para o convidado.');
    } catch (_) {
      setInviteNotice('Não foi possível copiar automaticamente. Use o reenvio por email.');
    } finally {
      setCopyingInviteId('');
    }
  };

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  if (!season) {
    return (
      <ShamarShell activeTab="shamar" blue>
        <ShamarHeader
          blue
          hrefBack="/shamar"
          label="SHAMAR em Dupla"
          title="Dupla"
          subtitle="Você ainda não tem uma Dupla ativa."
          stats={[
            { label: 'Pessoas', value: '2' },
            { label: 'Status', value: 'Livre' },
            { label: 'Controle', value: 'Individual' }
          ]}
        />
        <ShamarCard title="Criar Dupla">
          <div className="nos-benefits">
            <p>A Dupla nasce pela tela de criação. Depois disso, o convite fica pendente até a outra pessoa aceitar.</p>
            <Link className="nos-create-link" href="/shamar/criar?mode=dupla">Criar SHAMAR em Dupla</Link>
          </div>
        </ShamarCard>
        <style jsx>{`
          .nos-benefits {
            display: grid;
            gap: 10px;
          }

          .nos-benefits p {
            margin: 0;
            color: var(--text2);
            font-size: 13px;
            line-height: 1.6;
          }

          .nos-create-link {
            border-radius: var(--radius-md);
            background: var(--blue);
            color: white;
            font-weight: 900;
            padding: 13px 16px;
            text-align: center;
          }
        `}</style>
      </ShamarShell>
    );
  }

  const hasPartnership = data?.partnership && !data?.invite;

  return (
    <ShamarShell activeTab="shamar" blue>
      <ShamarHeader
        blue
        hrefBack="/shamar"
        label="SHAMAR em Dupla"
        title={hasPartnership ? 'Dupla ativa' : 'Convite pendente'}
        subtitle={hasPartnership ? 'Parceria ativa de constância patrimonial.' : 'A outra pessoa precisa aceitar o convite para a parceria aparecer aqui.'}
        stats={[
          { label: 'Status', value: hasPartnership ? 'Ativa' : 'Pendente' },
          { label: 'Patrimônio', value: formatMoney(data?.patrimonio_conjunto || 0, { compact: true }) },
          { label: 'Privacidade', value: 'Preservada' }
        ]}
      />

      {isNosLoading ? <ShamarCard><p className="nos-muted">Carregando NÓS...</p></ShamarCard> : null}
      {nosError ? <ShamarCard><p className="nos-muted">{nosError}</p></ShamarCard> : null}

      <div className="nos-action-row">
        <Link href="/shamar/aporte/novo?mode=dupla" className="nos-primary-action">
          Registrar Aporte
        </Link>
        <Link href="/shamar/encerramento?mode=dupla" className="nos-secondary-action">
          Encerrar SHAMAR
        </Link>
      </div>

      {pendingInvites.length > 0 ? (
        <ShamarCard title="Convite da Dupla">
          <div className="nos-invite-status">
            {inviteNotice ? <p className="nos-notice">{inviteNotice}</p> : null}
            {pendingInvites.map((invite) => (
              <div className="nos-invite-row" key={invite.id}>
                <div>
                  <strong>{invite.invited_email}</strong>
                  <span>{invite.email_sent ? 'Email enviado. Aguardando aceite.' : invite.email_error || 'Email ainda não confirmado.'}</span>
                </div>
                <div className="nos-invite-actions">
                  <button type="button" onClick={() => resendInvite(invite.id)} disabled={resendingInviteId === invite.id}>
                    {resendingInviteId === invite.id ? 'Enviando...' : 'Reenviar email'}
                  </button>
                  <button type="button" className="copy" onClick={() => copyInviteLink(invite)} disabled={copyingInviteId === invite.id || !invite.token}>
                    {copyingInviteId === invite.id ? 'Copiando...' : 'Copiar link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ShamarCard>
      ) : null}

      {!hasPartnership ? (
        <>
          <ShamarCard title="Aguardando aceite">
            <div className="nos-benefits">
              <p>Seu SHAMAR em Dupla foi criado para você. A outra pessoa só entra depois de criar conta, ser aprovada no ZeroApp e aceitar o convite recebido por email.</p>
              <p>Enquanto isso, seus aportes e quadrinhos continuam individuais.</p>
            </div>
          </ShamarCard>
        </>
      ) : (
        <>
          <ShamarCard title="Comparativo">
            <div className="nos-grid">
              <PersonCard title="Você" person={data.current} />
              <PersonCard title="Parceiro" person={data.partner} />
            </div>
          </ShamarCard>

          <section className="nos-total">
            <span>Patrimônio conjunto</span>
            <strong>{formatMoney(data.patrimonio_conjunto || 0)}</strong>
          </section>

          <ShamarCard title="Nota de privacidade">
            <div className="nos-benefits">
              <p>Se a parceria encerrar, seu histórico permanece.</p>
              <p>O SHAMAR não interfere em questões pessoais.</p>
            </div>
          </ShamarCard>
        </>
      )}

      <style jsx global>{`
        .nos-muted {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
        }

        .nos-benefits {
          display: grid;
          gap: 10px;
        }

        .nos-benefits p {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
          line-height: 1.6;
        }

        .nos-action-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }

        .nos-action-row a {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          font-weight: 900;
          padding: 12px 14px;
          text-align: center;
        }

        .nos-primary-action {
          background: var(--blue);
          color: white;
          box-shadow: 0 4px 16px rgba(21, 101, 192, 0.2);
        }

        .nos-secondary-action {
          border: 1px solid color-mix(in srgb, var(--shamar-gold) 55%, transparent);
          background: color-mix(in srgb, var(--shamar-gold) 12%, transparent);
          color: #7a5a00;
        }

        .nos-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .nos-person {
          border-radius: 12px;
          background: var(--blue-dim);
          padding: 16px;
          text-align: center;
          display: grid;
          justify-items: center;
          gap: 12px;
        }

        .nos-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--blue);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 900;
        }

        .nos-person-head {
          display: grid;
          gap: 3px;
          justify-items: center;
        }

        .nos-person-head span {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .nos-person-head strong {
          display: block;
          color: var(--text);
          font-size: 15px;
          font-weight: 900;
          line-height: 1.2;
        }

        .nos-metrics {
          width: 100%;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .nos-metrics div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border-top: 1px solid rgba(21, 101, 192, 0.14);
          padding-top: 8px;
        }

        .nos-metrics dt,
        .nos-metrics dd {
          margin: 0;
          font-size: 12px;
          line-height: 1.25;
        }

        .nos-metrics dt {
          color: var(--text3);
          font-weight: 800;
        }

        .nos-metrics dd {
          color: var(--blue);
          font-family: var(--font-mono);
          font-weight: 900;
          text-align: right;
        }

        .nos-invite-status {
          display: grid;
          gap: 10px;
        }

        .nos-notice {
          margin: 0;
          border-radius: 10px;
          background: var(--blue-dim);
          color: var(--blue);
          font-size: 12px;
          font-weight: 900;
          padding: 9px 10px;
        }

        .nos-invite-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
          padding: 12px;
        }

        .nos-invite-row strong {
          display: block;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .nos-invite-row span {
          display: block;
          color: var(--text3);
          font-size: 11px;
          line-height: 1.4;
          margin-top: 2px;
        }

        .nos-invite-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .nos-invite-row button {
          border: 1px solid var(--blue);
          border-radius: 999px;
          background: var(--blue);
          color: white;
          cursor: pointer;
          font-weight: 900;
          padding: 9px 12px;
          white-space: nowrap;
        }

        .nos-invite-row button.copy {
          background: white;
          color: var(--blue);
        }

        .nos-invite-row button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .nos-total {
          border-radius: var(--radius-xl);
          background: var(--shamar-gold-dim);
          border: 1px solid var(--gold-mid);
          text-align: center;
          padding: 18px;
          margin-bottom: 14px;
        }

        .nos-total span {
          display: block;
          color: var(--gold-dark);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .nos-total strong {
          display: block;
          color: var(--gold-dark);
          font-family: var(--font-mono);
          font-size: 24px;
          margin-top: 4px;
        }

        @media (max-width: 560px) {
          .nos-action-row,
          .nos-invite-row,
          .nos-grid {
            grid-template-columns: 1fr;
          }

          .nos-invite-actions {
            flex-direction: column;
            justify-content: stretch;
          }

          .nos-invite-row button {
            width: 100%;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
