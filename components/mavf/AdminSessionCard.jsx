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
      ? 'bg-[rgba(0,200,83,0.15)] text-[#00C853]'
      : session.status === 'completed'
        ? 'bg-[rgba(136,136,136,0.15)] text-[#888]'
        : 'bg-[rgba(255,215,0,0.12)] text-[#FFD700]';

  return (
    <div
      className={`bg-[#222222] border rounded-[12px] p-5 mb-4 ${
        session.status === 'active' ? 'border-[#00C853]' : 'border-[#333333]'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border border-[#333]" style={{ background: session.color_hex }} />
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
              className="px-3 py-2 rounded-[8px] border border-[#64b4ff] text-[#64b4ff] text-xs font-semibold"
            >
              Participantes
            </button>
          ) : null}
          {typeof onEditSession === 'function' ? (
            <button
              onClick={() => onEditSession(session)}
              className="px-3 py-2 rounded-[8px] border border-[#ffcf5a] text-[#ffcf5a] text-xs font-semibold"
            >
              Editar
            </button>
          ) : null}
          <button
            onClick={() => setExpanded((value) => !value)}
            className="px-3 py-2 rounded-[8px] border border-[#00C853] text-[#00C853] text-xs font-semibold"
          >
            {expanded ? 'Recolher' : 'Expandir'}
          </button>
          {session.status === 'active' ? (
            <button
              onClick={() => onComplete(session.id)}
              className="px-3 py-2 rounded-[8px] border border-[#FF5252] text-[#FF5252] text-xs font-semibold"
            >
              Finalizar
            </button>
          ) : null}
          {typeof onDeleteSession === 'function' ? (
            <button
              onClick={() => onDeleteSession(session)}
              className="px-3 py-2 rounded-[8px] border border-[#FF5252] text-[#FF5252] text-xs font-semibold"
            >
              Excluir
            </button>
          ) : null}
        </div>
      </div>

      {session.status === 'active' ? (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-[10px] p-4 mb-4">
          <div className="text-sm text-[#aaa] mb-2">
            Pilar atual: <span className="text-[#fff] font-semibold">{session.current_pillar || 'nenhum'}</span>
          </div>
          <ProgressIndicator value={currentPillarResponses} max={totalParticipants || currentPillarResponses || 1} />
        </div>
      ) : null}

      <div className="text-xs text-[#8da0b8] mb-4">
        Participantes liberados: <span className="text-[#d3e5ff] font-semibold">{totalParticipants}</span>
      </div>

      {session.status === 'draft' ? (
        <div className="bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.28)] rounded-[10px] p-3 mb-4 text-xs text-[#f0d87a]">
          Esta sessão ainda está em rascunho e não aparece para os mentorados.
          Libere o primeiro pilar para ativar.
        </div>
      ) : null}

      {session.status === 'completed' ? (
        <div className="bg-[rgba(136,136,136,0.1)] border border-[rgba(136,136,136,0.35)] rounded-[10px] p-3 mb-4 text-xs text-[#b7bec7]">
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
                    ? 'bg-[#00C853] text-[#000] border-[#00C853] font-bold'
                    : 'bg-[#1a1a1a] border-[#333] hover:border-[rgba(0,200,83,0.35)]'
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
