'use client';

import { useMemo, useState } from 'react';
import { MAVF_PILLARS } from '@/lib/mavf-config';
import ProgressIndicator from '@/components/mavf/ProgressIndicator';

export default function AdminSessionCard({
  session,
  responseStats,
  onStartPillar,
  onComplete,
  onRefresh,
  onManageParticipants,
  onEditSession,
  onDeleteSession
}) {
  const [expanded, setExpanded] = useState(session.status === 'active');

  const totalParticipants = responseStats?.participantsCount || 0;

  const currentPillarResponses = useMemo(() => {
    if (!session.current_pillar) return 0;
    return responseStats?.countsByPillar?.[session.current_pillar] || 0;
  }, [responseStats, session.current_pillar]);

  const currentPillarIndex = MAVF_PILLARS.findIndex((pillar) => pillar.id === session.current_pillar);
  const currentPillar = currentPillarIndex >= 0 ? MAVF_PILLARS[currentPillarIndex] : null;
  const nextPillar = currentPillarIndex >= 0 ? MAVF_PILLARS[currentPillarIndex + 1] || null : MAVF_PILLARS[0];

  const statusLabel = session.status === 'active' ? 'Ao vivo' : session.status === 'completed' ? 'Finalizada' : 'Em preparação';

  const statusClass =
    session.status === 'active'
      ? 'bg-[var(--green-dim)] text-[var(--green)]'
      : session.status === 'completed'
        ? 'bg-[var(--bg3)] text-[var(--muted)]'
        : 'bg-[var(--gold-dim)] text-[var(--gold)]';

  return (
    <div
      className={`bg-[var(--bg2)] border rounded-[14px] p-4 md:p-5 mb-4 ${
        session.status === 'active' ? 'border-[var(--green)]' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-4 h-4 rounded-full border border-[var(--border)]" style={{ background: session.color_hex }} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold break-words">{session.title}</h3>
            <div className={`inline-flex mt-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.5px] ${statusClass}`}>
              {statusLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {typeof onManageParticipants === 'function' ? (
            <button
              onClick={() => onManageParticipants(session)}
              className="px-3 py-2 rounded-[8px] border border-[var(--blue)] text-[var(--blue)] text-xs font-semibold"
            >
              Participantes
            </button>
          ) : null}
          {typeof onEditSession === 'function' ? (
            <button
              onClick={() => onEditSession(session)}
              className="px-3 py-2 rounded-[8px] border border-[var(--gold)] text-[var(--gold)] text-xs font-semibold"
            >
              Editar
            </button>
          ) : null}
          <button
            onClick={() => setExpanded((value) => !value)}
            className="px-3 py-2 rounded-[8px] border border-[var(--green)] text-[var(--green)] text-xs font-semibold"
          >
            {expanded ? 'Recolher' : 'Expandir'}
          </button>
          {session.status === 'active' ? (
            <>
              {typeof onRefresh === 'function' ? (
                <button
                  onClick={onRefresh}
                  className="px-3 py-2 rounded-[8px] border border-[var(--blue)] text-[var(--blue)] text-xs font-semibold"
                >
                  ↻ Atualizar respostas
                </button>
              ) : null}
              <button
                onClick={() => onComplete(session.id)}
                className="px-3 py-2 rounded-[8px] border border-[var(--red)] text-[var(--red)] text-xs font-semibold"
              >
                Finalizar
              </button>
            </>
          ) : null}
          {typeof onDeleteSession === 'function' ? (
            <button
              onClick={() => onDeleteSession(session)}
              className="px-3 py-2 rounded-[8px] border border-[var(--red)] text-[var(--red)] text-xs font-semibold"
            >
              Excluir
            </button>
          ) : null}
        </div>
      </div>

      {session.status === 'active' ? (
        <div className="bg-[var(--bg)] border border-[var(--green)] rounded-[12px] p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.8px] font-bold text-[var(--green)] mb-1">Pilar liberado agora</div>
              <div className="text-xl font-black text-[var(--text)]">
                {currentPillar ? `${currentPillar.emoji} ${currentPillar.label}` : 'Nenhum pilar liberado'}
              </div>
              <div className="text-xs text-[var(--text-2)] mt-1">
                {currentPillarResponses} de {totalParticipants || 0} participantes responderam
              </div>
            </div>
            {nextPillar ? (
              <button
                type="button"
                onClick={() => onStartPillar(session.id, nextPillar.id)}
                className="rounded-[10px] bg-[var(--green)] px-4 py-3 text-sm font-black text-[var(--text-on-green)]"
              >
                Liberar próximo: {nextPillar.emoji} {nextPillar.label} →
              </button>
            ) : (
              <div className="rounded-[10px] border border-[var(--border)] px-4 py-3 text-xs text-[var(--text-2)]">
                Último pilar em andamento
              </div>
            )}
          </div>
          <ProgressIndicator value={currentPillarResponses} max={totalParticipants || currentPillarResponses || 1} />
        </div>
      ) : null}

      <div className="text-xs text-[var(--text-2)] mb-4">
        Participantes liberados: <span className="text-[var(--text)] font-semibold">{totalParticipants}</span>
      </div>

      {session.status === 'draft' ? (
        <div className="bg-[var(--gold-dim)] border border-[var(--gold)] rounded-[10px] p-4 mb-4 text-xs text-[var(--gold)]">
          <div className="font-bold mb-2">Checklist para iniciar</div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-current px-3 py-1">✓ Sessão criada</span>
            <span className="rounded-full border border-current px-3 py-1">
              {totalParticipants > 0 ? '✓' : '2.'} {totalParticipants} participante(s)
            </span>
            <span className="rounded-full border border-current px-3 py-1">3. Liberar primeiro pilar</span>
          </div>
          {totalParticipants === 0 ? <div className="mt-3">Adicione participantes antes de iniciar a sessão.</div> : null}
        </div>
      ) : null}

      {session.status === 'completed' ? (
        <div className="bg-[var(--bg3)] border border-[var(--border)] rounded-[10px] p-3 mb-4 text-xs text-[var(--text-2)]">
          Sessão finalizada. Para reativar, selecione um pilar abaixo.
        </div>
      ) : null}

      {expanded ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {MAVF_PILLARS.map((pillar) => {
            const active = session.current_pillar === pillar.id;
            const count = responseStats?.countsByPillar?.[pillar.id] || 0;
            return (
              <button
                key={pillar.id}
                onClick={() => onStartPillar(session.id, pillar.id)}
                className={`p-3 rounded-[8px] text-left border transition-all ${
                  active
                    ? 'bg-[var(--green)] text-[var(--bg)] border-[var(--green)] font-bold'
                    : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--green)]'
                }`}
              >
                <div className="text-base">{pillar.emoji}</div>
                <div className="text-xs mt-1">{pillar.label}</div>
                <div className="text-[10px] mt-1 opacity-80">
                  {session.status === 'completed' ? 'Reativar neste pilar' : `${count} respostas`}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
