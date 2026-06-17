'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { modePath } from '@/components/shamar/ShamarModeCreator';

function modeLabel(mode) {
  if (mode === 'dupla') return 'SHAMAR em Dupla';
  if (mode === 'tribo') return 'SHAMAR Tribo';
  return 'SHAMAR';
}

function inviteSummary(invite) {
  const inviter = invite?.inviter?.name || 'A pessoa que convidou você';
  return `${inviter} quer construir patrimônio junto com você no ${modeLabel(invite?.mode)}.`;
}

export default function ShamarInvitesPage() {
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [accepted, setAccepted] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  useEffect(() => {
    let active = true;

    const loadInvite = async () => {
      setIsLoading(true);
      setError('');
      setAccepted(null);

      try {
        const path = token ? `/api/shamar/invites?token=${encodeURIComponent(token)}` : '/api/shamar/invites';
        const res = await fetch(path, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'shamar_invite_fetch_failed');
        if (!active) return;
        setInvite(data?.invite || null);
        setIncoming(Array.isArray(data?.incoming) ? data.incoming : []);
      } catch (fetchError) {
        if (active) {
          setInvite(null);
          setIncoming([]);
          setError(fetchError?.message || 'shamar_invite_fetch_failed');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadInvite();
    return () => {
      active = false;
    };
  }, [token]);

  const acceptInvite = async (selectedInvite) => {
    const selectedToken = selectedInvite?.token || token;
    if (!selectedToken) return;

    setIsAccepting(true);
    setError('');
    try {
      const res = await fetch('/api/shamar/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: selectedToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'shamar_invite_accept_failed');
      setAccepted(data);
      setInvite((current) => current ? { ...current, status: 'accepted' } : current);
      setIncoming((current) => current.filter((item) => item.token !== selectedToken));
    } catch (acceptError) {
      setError(acceptError?.message || 'shamar_invite_accept_failed');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) return <ShamarLoading label="Carregando convite..." />;
  if (error && !invite && incoming.length === 0) return <ShamarSetupError error={error} />;

  const visibleInvites = invite ? [invite] : incoming;
  const acceptedPath = accepted ? modePath(accepted.mode) : '/shamar';

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        hrefBack="/shamar"
        label="Convite SHAMAR"
        title="Aceitar convite"
        subtitle="Após o aceite, seu tabuleiro aparece na modalidade correspondente."
        stats={[
          { label: 'Convites', value: visibleInvites.length },
          { label: 'Entrada', value: 'Aceite' },
          { label: 'Controle', value: 'Seu' }
        ]}
      />

      {error ? <div className="invite-error">{error}</div> : null}

      {accepted ? (
        <ShamarCard title="Convite aceito">
          <div className="invite-accepted">
            <p>Pronto. Seu SHAMAR foi criado e agora aparece para acompanhamento.</p>
            <Link href={acceptedPath}>Abrir {modeLabel(accepted.mode)}</Link>
          </div>
        </ShamarCard>
      ) : null}

      {!accepted && visibleInvites.length === 0 ? (
        <ShamarCard title="Nenhum convite pendente">
          <p className="invite-muted">Não encontramos convites pendentes para sua conta.</p>
        </ShamarCard>
      ) : null}

      {!accepted && visibleInvites.map((item) => (
        <ShamarCard title={modeLabel(item.mode)} key={item.id}>
          <div className="invite-card-body">
            <p>{inviteSummary(item)}</p>
            <div className="invite-details">
              <div>
                <span>Convidou</span>
                <strong>{item.inviter?.name || 'ZeroApp'}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{item.status === 'pending' ? 'Pendente' : item.status}</strong>
              </div>
            </div>
            <button type="button" onClick={() => acceptInvite(item)} disabled={isAccepting || item.status !== 'pending'}>
              {isAccepting ? 'Aceitando...' : 'Aceitar convite'}
            </button>
          </div>
        </ShamarCard>
      ))}

      <style jsx>{`
        .invite-error {
          border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
          background: color-mix(in srgb, var(--red) 8%, transparent);
          color: var(--red);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-weight: 800;
        }

        .invite-card-body,
        .invite-accepted {
          display: grid;
          gap: 14px;
        }

        .invite-card-body p,
        .invite-accepted p,
        .invite-muted {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
          line-height: 1.6;
        }

        .invite-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .invite-details div {
          border-radius: 12px;
          background: var(--shamar-dim);
          padding: 12px;
        }

        .invite-details span {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .invite-details strong {
          color: var(--shamar-dark);
          font-size: 13px;
          font-weight: 900;
        }

        .invite-card-body button,
        .invite-accepted a {
          border: 0;
          border-radius: var(--radius-md);
          background: var(--shamar-dark);
          color: white;
          font-weight: 900;
          padding: 14px 16px;
          text-align: center;
        }

        .invite-card-body button:disabled {
          opacity: 0.65;
        }
      `}</style>
    </ShamarShell>
  );
}
