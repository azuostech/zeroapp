'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  BoardGrid,
  CategoryLegend,
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { useShamarBoard } from '@/hooks/useShamarBoard';
import { formatMoney, formatPercent, identityLabel } from '@/src/lib/shamar/formatters';

export default function ShamarTriboPage() {
  const router = useRouter();
  const { season, config, progress, locked, unlockProgress, error, isLoading } = useShamar('tribo');
  const { squares, stats: boardStats, error: boardError, isLoading: isBoardLoading } = useShamarBoard(season?.id);
  const [tribo, setTribo] = useState(null);
  const [triboError, setTriboError] = useState(null);
  const [isTriboLoading, setIsTriboLoading] = useState(false);
  const [triboName, setTriboName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [manageMessage, setManageMessage] = useState('');
  const [savingManageAction, setSavingManageAction] = useState('');
  const [resendingInviteId, setResendingInviteId] = useState('');
  const [copyingInviteId, setCopyingInviteId] = useState('');
  const [closedNotice, setClosedNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('shamar_closed')) return;
    setClosedNotice('Temporada encerrada. Você já pode criar uma nova Tribo.');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const loadTribo = useCallback(async () => {
    if (!season?.tribo_config_id) {
      setTribo(null);
      return;
    }

    setIsTriboLoading(true);
    setTriboError(null);

    try {
      const res = await fetch(`/api/shamar/tribo?tribo_config_id=${encodeURIComponent(season.tribo_config_id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'shamar_tribo_fetch_failed');
      setTribo(data);
      setTriboName(data?.config?.turma || '');
    } catch (fetchError) {
      setTribo(null);
      setTriboError(fetchError?.message || 'shamar_tribo_fetch_failed');
    } finally {
      setIsTriboLoading(false);
    }
  }, [season?.tribo_config_id]);

  useEffect(() => {
    loadTribo();
  }, [loadTribo]);

  const manageTribo = async ({ method, body, successMessage, resetInvites = false, afterSuccess = null }) => {
    if (!season?.tribo_config_id) return;
    setSavingManageAction(body?.action || method);
    setManageMessage('');

    try {
      const res = await fetch('/api/shamar/tribo', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tribo_config_id: season.tribo_config_id,
          ...body
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'shamar_tribo_manage_failed');
      setManageMessage(successMessage);
      if (resetInvites) setInviteEmails('');
      if (afterSuccess) {
        await afterSuccess(data);
      } else {
        await loadTribo();
      }
    } catch (manageError) {
      setManageMessage(manageError?.message || 'Não foi possível atualizar a TRIBO.');
    } finally {
      setSavingManageAction('');
    }
  };

  const saveTriboName = () => {
    manageTribo({
      method: 'PATCH',
      body: { turma: triboName },
      successMessage: 'Nome da TRIBO atualizado.'
    });
  };

  const inviteParticipants = () => {
    manageTribo({
      method: 'POST',
      body: { action: 'invite', invite_emails: inviteEmails },
      successMessage: 'Convites enviados para a TRIBO.',
      resetInvites: true
    });
  };

  const removeParticipant = (participant) => {
    const ok = window.confirm(`Remover ${participant.name || participant.email || 'participante'} desta TRIBO? O histórico de aportes será preservado.`);
    if (!ok) return;
    manageTribo({
      method: 'DELETE',
      body: { action: 'remove_participant', season_id: participant.season_id },
      successMessage: 'Participante removido da TRIBO.'
    });
  };

  const cancelInvite = (invite) => {
    manageTribo({
      method: 'DELETE',
      body: { action: 'cancel_invite', invite_id: invite.id },
      successMessage: 'Convite cancelado.'
    });
  };

  const resendInvite = async (invite) => {
    setResendingInviteId(invite.id);
    setManageMessage('');

    try {
      const res = await fetch('/api/shamar/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          invite_id: invite.id
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'shamar_invite_resend_failed');
      setManageMessage(`Email reenviado para ${invite.invited_email}.`);
      await loadTribo();
    } catch (resendError) {
      setManageMessage(resendError?.message || 'Não foi possível reenviar o convite.');
    } finally {
      setResendingInviteId('');
    }
  };

  const copyInviteLink = async (invite) => {
    setCopyingInviteId(invite.id);
    setManageMessage('');

    try {
      if (!invite.accept_url) throw new Error('Link indisponível para este convite.');
      await navigator.clipboard.writeText(invite.accept_url);
      setManageMessage('Link do convite copiado.');
    } catch (copyError) {
      setManageMessage(copyError?.message || 'Não foi possível copiar o link.');
    } finally {
      setCopyingInviteId('');
    }
  };

  const closeTribe = () => {
    const ok = window.confirm('Encerrar esta TRIBO para todos os participantes? Essa ação preserva o histórico e cancela convites pendentes.');
    if (!ok) return;
    manageTribo({
      method: 'DELETE',
      body: { action: 'close_tribe' },
      successMessage: 'TRIBO encerrada.',
      afterSuccess: () => router.push('/shamar')
    });
  };

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  if (!season) {
    return (
      <ShamarShell activeTab="tribo">
        <ShamarHeader
          hrefBack="/shamar"
          label="SHAMAR Tribo"
          title="Tribo"
          subtitle="Você ainda não tem uma Tribo ativa."
          stats={[
            { label: 'Pessoas', value: '3+' },
            { label: 'Status', value: 'Livre' },
            { label: 'Controle', value: 'Individual' }
          ]}
        />
        {closedNotice ? <p className="tribo-closed-notice">{closedNotice}</p> : null}
        <ShamarCard title="Criar Tribo">
          <div className="tribo-empty">
            <p>Crie uma Tribo convidando pelo menos duas pessoas. Cada participante terá o próprio tabuleiro após aceitar.</p>
            <Link href="/shamar/criar?mode=tribo">Criar SHAMAR Tribo</Link>
          </div>
        </ShamarCard>
        <style jsx>{`
          .tribo-empty {
            display: grid;
            gap: 12px;
          }

          .tribo-closed-notice {
            border: 1px solid rgba(27, 94, 32, 0.18);
            border-radius: var(--radius-md);
            background: var(--shamar-dim);
            color: var(--shamar-dark);
            margin: 0 0 14px;
            padding: 12px 14px;
            font-size: 13px;
            font-weight: 900;
            line-height: 1.4;
          }

          .tribo-empty p {
            margin: 0;
            color: var(--text2);
            font-size: 13px;
            line-height: 1.6;
          }

          .tribo-empty a {
            border-radius: var(--radius-md);
            background: var(--shamar-dark);
            color: white;
            font-weight: 900;
            padding: 13px 16px;
            text-align: center;
          }
        `}</style>
      </ShamarShell>
    );
  }

  const stats = tribo?.stats || {};
  const ranking = tribo?.ranking || [];
  const feed = tribo?.feed || [];
  const participants = tribo?.participants || [];
  const pendingInvites = tribo?.pending_invites || [];
  const canManageTribo = Boolean(tribo?.permissions?.can_manage);
  const modeQuery = 'mode=tribo';
  const markedSquares = Number(progress?.squares_marked || boardStats?.marked || 0);
  const totalSquares = Number(progress?.squares_total || boardStats?.total || 0);
  const accumulated = Number(progress?.contributions_total || boardStats?.sum_marked || 0);

  return (
    <ShamarShell activeTab="tribo">
      <ShamarHeader
        hrefBack="/shamar"
        label={`Camada 3 · Turma ${config?.turma || 'SHAMAR'}`}
        title="👥 TRIBO"
        subtitle={`${Number(stats.guardians || 0)} guardiões construindo patrimônio juntos`}
        stats={[
          { label: 'Patrimônio', value: formatMoney(stats.patrimonio_total || 0, { compact: true }) },
          { label: 'Meta coletiva', value: formatPercent(stats.progress_pct || 0) },
          { label: 'Constância', value: Number(stats.constancia_media || 0) }
        ]}
      />

      {isTriboLoading ? <ShamarCard><p className="tribo-muted">Carregando TRIBO...</p></ShamarCard> : null}
      {triboError ? <ShamarCard><p className="tribo-muted">{triboError}</p></ShamarCard> : null}

      <section className="tribo-meta-card">
        <div className="tribo-meta-head">
          <span>Meta Coletiva da TRIBO</span>
          <div>
            <strong>{formatMoney(stats.patrimonio_total || 0)}</strong>
            <em>de {formatMoney(stats.meta_total || config?.meta_total || 0)}</em>
          </div>
        </div>
        <div className="tribo-meta-body">
          <div className="tribo-track">
            <div style={{ width: `${Math.max(0, Math.min(100, Number(stats.progress_pct || 0)))}%` }} />
          </div>
          <div className="tribo-meta-stats">
            <div><strong>{Number(stats.guardians || 0)}</strong><span>guardiões</span></div>
            <div><strong>{Number(stats.squares_marked_total || 0)}</strong><span>quadrinhos</span></div>
            <div><strong>{formatMoney(stats.faltam || 0, { compact: true })}</strong><span>faltam</span></div>
          </div>
        </div>
      </section>

      <ShamarCard
        title="Meu tabuleiro na TRIBO"
        action={<Link className="tribo-card-link" href={`/shamar/tabuleiro?${modeQuery}`}>Ver completo</Link>}
      >
        <div className="tribo-board-summary">
          <div>
            <strong>{formatMoney(accumulated, { compact: true })}</strong>
            <span>meu patrimônio</span>
          </div>
          <div>
            <strong>{markedSquares}/{totalSquares || '—'}</strong>
            <span>meus quadrinhos</span>
          </div>
          <div>
            <strong>{formatMoney(config?.meta_total || boardStats?.sum_total || 0, { compact: true })}</strong>
            <span>minha meta</span>
          </div>
        </div>

        <p className="tribo-board-note">
          Seus aportes são lançados no seu próprio tabuleiro e também entram na soma coletiva da TRIBO.
        </p>

        {boardError ? <p className="tribo-muted">{boardError}</p> : null}
        {isBoardLoading ? <p className="tribo-muted">Carregando seu tabuleiro...</p> : null}
        {!isBoardLoading && squares.length > 0 ? (
          <>
            <CategoryLegend compact />
            <BoardGrid squares={squares} preview onSquareClick={() => router.push(`/shamar/tabuleiro?${modeQuery}`)} />
          </>
        ) : null}
        {!isBoardLoading && !boardError && squares.length === 0 ? (
          <p className="tribo-muted">Seu tabuleiro ainda não foi gerado.</p>
        ) : null}

        <div className="tribo-board-actions">
          <Link href={`/shamar/aporte/novo?${modeQuery}`} className="tribo-primary-action">
            Registrar Aporte
          </Link>
          <Link href={`/shamar/tabuleiro?${modeQuery}`} className="tribo-secondary-action">
            Abrir Tabuleiro
          </Link>
        </div>
      </ShamarCard>

      <ShamarCard title="Ranking Constância">
        {ranking.length === 0 ? <p className="tribo-muted">Ranking ainda sem dados.</p> : null}
        <div className="ranking-list">
          {ranking.slice(0, 5).map((item) => (
            <div className={`ranking-row${item.current_user ? ' current' : ''}`} key={item.season_id}>
              <span className="ranking-pos">{item.position}</span>
              <span className="ranking-avatar">{item.avatar}</span>
              <div>
                <strong>{item.name}</strong>
                <em>{identityLabel(item.identity_level)}</em>
              </div>
              <div className="ranking-right">
                <strong>{item.index_total}</strong>
                <em>{item.weeks} semanas</em>
              </div>
            </div>
          ))}
        </div>
      </ShamarCard>

      <ShamarCard title="Feed da TRIBO">
        {feed.length === 0 ? <p className="tribo-muted">Nenhuma ação recente ainda.</p> : null}
        <div className="tribo-feed">
          {feed.map((event) => (
            <div className="tribo-feed-row" key={event.id}>
              <span>💰</span>
              <div>
                <strong>{event.title}</strong>
                <em>{formatMoney(event.amount)} · {event.date}</em>
              </div>
            </div>
          ))}
        </div>
      </ShamarCard>

      {canManageTribo ? (
        <ShamarCard title="Gerenciar TRIBO">
          <div className="tribo-manage">
            {manageMessage ? <p className="tribo-manage-message">{manageMessage}</p> : null}

            <div className="tribo-manage-grid">
              <label>
                <span>Nome da TRIBO</span>
                <input value={triboName} onChange={(event) => setTriboName(event.target.value)} />
              </label>
              <button type="button" onClick={saveTriboName} disabled={Boolean(savingManageAction)}>
                {savingManageAction === 'PATCH' ? 'Salvando...' : 'Salvar nome'}
              </button>
            </div>

            <div className="tribo-manage-grid">
              <label>
                <span>Adicionar participantes</span>
                <input
                  value={inviteEmails}
                  onChange={(event) => setInviteEmails(event.target.value)}
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                />
              </label>
              <button type="button" onClick={inviteParticipants} disabled={Boolean(savingManageAction)}>
                {savingManageAction === 'invite' ? 'Enviando...' : 'Enviar convites'}
              </button>
            </div>

            <div className="tribo-manage-list">
              <strong>Participantes</strong>
              {participants.length === 0 ? <p className="tribo-muted">Nenhum participante ativo.</p> : null}
              {participants.map((participant) => (
                <div className="tribo-manage-row" key={participant.season_id}>
                  <div>
                    <span>{participant.name}</span>
                    <em>{participant.email || 'Email não encontrado'}{participant.is_creator ? ' · criador' : ''}</em>
                  </div>
                  {!participant.is_creator ? (
                    <button type="button" onClick={() => removeParticipant(participant)} disabled={Boolean(savingManageAction)}>
                      Remover
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="tribo-manage-list">
              <strong>Convites pendentes</strong>
              {pendingInvites.length === 0 ? <p className="tribo-muted">Nenhum convite pendente.</p> : null}
              {pendingInvites.map((invite) => (
                <div className="tribo-manage-row" key={invite.id}>
                  <div>
                    <span>{invite.invited_email}</span>
                    <em>{invite.email_sent ? 'Email enviado' : invite.email_error || 'Email pendente'}</em>
                  </div>
                  <div className="tribo-manage-row-actions">
                    <button type="button" onClick={() => resendInvite(invite)} disabled={resendingInviteId === invite.id || Boolean(savingManageAction)}>
                      {resendingInviteId === invite.id ? 'Reenviando...' : 'Reenviar'}
                    </button>
                    <button type="button" onClick={() => copyInviteLink(invite)} disabled={copyingInviteId === invite.id || !invite.accept_url}>
                      {copyingInviteId === invite.id ? 'Copiando...' : 'Copiar link'}
                    </button>
                    <button type="button" onClick={() => cancelInvite(invite)} disabled={Boolean(savingManageAction)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="tribo-close-action" onClick={closeTribe} disabled={Boolean(savingManageAction)}>
              Encerrar TRIBO
            </button>
          </div>
        </ShamarCard>
      ) : null}

      <style jsx>{`
        .tribo-muted {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
        }

        .tribo-card-link {
          color: var(--shamar-dark);
          font-size: 12px;
          font-weight: 800;
        }

        .tribo-manage {
          display: grid;
          gap: 12px;
        }

        .tribo-manage-message {
          margin: 0;
          border-radius: 10px;
          background: var(--shamar-dim);
          color: var(--shamar-dark);
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .tribo-manage-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: end;
        }

        .tribo-manage-grid label {
          display: grid;
          gap: 6px;
        }

        .tribo-manage-grid span {
          color: var(--text2);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .tribo-manage-grid input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg2);
          color: var(--text);
          padding: 12px;
          font: inherit;
          font-size: 13px;
        }

        .tribo-manage-grid button,
        .tribo-manage-row button,
        .tribo-close-action {
          border: 1px solid rgba(27, 94, 32, 0.22);
          border-radius: 10px;
          background: var(--shamar-dim);
          color: var(--shamar-dark);
          padding: 11px 13px;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .tribo-manage-list {
          display: grid;
          gap: 8px;
          border-top: 1px solid var(--border);
          padding-top: 12px;
        }

        .tribo-manage-list > strong {
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .tribo-manage-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
          padding: 10px;
        }

        .tribo-manage-row span,
        .tribo-manage-row em {
          display: block;
        }

        .tribo-manage-row span {
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .tribo-manage-row em {
          color: var(--text3);
          font-size: 11px;
          font-style: normal;
          margin-top: 2px;
        }

        .tribo-manage-row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tribo-close-action {
          border-color: color-mix(in srgb, var(--red) 35%, transparent);
          background: color-mix(in srgb, var(--red) 8%, transparent);
          color: var(--red);
        }

        .tribo-manage-grid button:disabled,
        .tribo-manage-row button:disabled,
        .tribo-close-action:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .tribo-board-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .tribo-board-summary div {
          border-radius: 12px;
          background: var(--shamar-dim);
          padding: 12px;
          text-align: center;
        }

        .tribo-board-summary strong {
          display: block;
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 14px;
        }

        .tribo-board-summary span {
          display: block;
          color: var(--text3);
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .tribo-board-note {
          margin: 0 0 12px;
          color: var(--text2);
          font-size: 12px;
          line-height: 1.5;
        }

        .tribo-board-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .tribo-board-actions a {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          font-weight: 900;
          padding: 12px 14px;
          text-align: center;
        }

        .tribo-primary-action {
          background: var(--shamar-dark);
          color: white;
          box-shadow: 0 4px 16px rgba(27, 94, 32, 0.24);
        }

        .tribo-secondary-action {
          border: 1px solid rgba(27, 94, 32, 0.22);
          background: var(--shamar-dim);
          color: var(--shamar-dark);
        }

        .tribo-meta-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          margin-bottom: 14px;
        }

        .tribo-meta-head {
          background: var(--shamar-dark);
          color: white;
          padding: 14px 16px;
        }

        .tribo-meta-head span {
          display: block;
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .tribo-meta-head div {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }

        .tribo-meta-head strong {
          color: var(--shamar-gold);
          font-family: var(--font-mono);
          font-size: 22px;
        }

        .tribo-meta-head em {
          color: rgba(255,255,255,0.7);
          font-style: normal;
          font-size: 12px;
          font-weight: 700;
        }

        .tribo-meta-body {
          padding: 14px 16px;
        }

        .tribo-track {
          height: 10px;
          border-radius: var(--radius-full);
          background: var(--green-mid);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .tribo-track div {
          height: 100%;
          border-radius: var(--radius-full);
          background: var(--shamar-dark);
        }

        .tribo-meta-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .tribo-meta-stats div {
          text-align: center;
        }

        .tribo-meta-stats strong {
          display: block;
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 14px;
        }

        .tribo-meta-stats span {
          color: var(--text3);
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ranking-list,
        .tribo-feed {
          display: grid;
          gap: 0;
        }

        .ranking-row,
        .tribo-feed-row {
          display: grid;
          grid-template-columns: 26px 38px 1fr auto;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding: 11px 0;
        }

        .tribo-feed-row {
          grid-template-columns: 32px 1fr;
        }

        .ranking-row:last-child,
        .tribo-feed-row:last-child {
          border-bottom: 0;
        }

        .ranking-row.current {
          border-radius: 12px;
          background: var(--shamar-dim);
          padding-left: 8px;
          padding-right: 8px;
        }

        .ranking-pos {
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-weight: 900;
          text-align: center;
        }

        .ranking-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--shamar-dark);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .ranking-row strong,
        .tribo-feed-row strong {
          display: block;
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
        }

        .ranking-row em,
        .tribo-feed-row em {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-style: normal;
        }

        .ranking-right {
          text-align: right;
        }

        .ranking-right strong {
          color: var(--shamar-dark);
          font-family: var(--font-mono);
        }

        @media (max-width: 560px) {
          .tribo-board-summary,
          .tribo-board-actions,
          .tribo-manage-grid,
          .tribo-manage-row {
            grid-template-columns: 1fr;
          }

          .tribo-manage-row-actions {
            justify-content: stretch;
          }

          .tribo-manage-row-actions button {
            flex: 1;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
