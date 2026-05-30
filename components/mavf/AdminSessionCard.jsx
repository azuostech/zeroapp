'use client';

import { useMemo, useState } from 'react';
import { MAVF_PILLARS } from '@/lib/mavf-config';
import ProgressIndicator from '@/components/mavf/ProgressIndicator';

export default function AdminSessionCard({
  session,
  responseStats,
  onStartPillar,
  onComplete,
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

  const statusClass =
    session.status === 'active'
      ? 'bg-[var(--green-dim)] text-[var(--green)]'
      : session.status === 'completed'
        ? 'bg-[var(--bg3)] text-[var(--muted)]'
        : 'bg-[var(--gold-dim)] text-[var(--gold)]';

  return (
    <div
      className={`bg-[var(--bg2)] border rounded-[12px] p-5 mb-4 ${
        session.status === 'active' ? 'border-[var(--green)]' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border border-[var(--border)]" style={{ background: session.color_hex }} />
          <div>
            <h3 className="text-lg font-semibold">{session.title}</h3>
            <div className={`inline-flex mt-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.5px] ${statusClass}`}>
              {session.status}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
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
            <button
              onClick={() => onComplete(session.id)}
              className="px-3 py-2 rounded-[8px] border border-[var(--red)] text-[var(--red)] text-xs font-semibold"
            >
              Finalizar
            </button>
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
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[10px] p-4 mb-4">
          <div className="text-sm text-[var(--text-2)] mb-2">
            Pilar atual: <span className="text-[var(--text)] font-semibold">{session.current_pillar || 'nenhum'}</span>
          </div>
          <ProgressIndicator value={currentPillarResponses} max={totalParticipants || currentPillarResponses || 1} />
        </div>
      ) : null}

      <div className="text-xs text-[var(--text-2)] mb-4">
        Participantes liberados: <span className="text-[var(--text)] font-semibold">{totalParticipants}</span>
      </div>

      {session.status === 'draft' ? (
        <div className="bg-[var(--gold-dim)] border border-[var(--gold)] rounded-[10px] p-3 mb-4 text-xs text-[var(--gold)]">
          Esta sessão ainda está em rascunho e não aparece para os mentorados.
          Libere o primeiro pilar para ativar.
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
