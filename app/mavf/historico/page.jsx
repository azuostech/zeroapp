'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import WheelChart from '@/components/mavf/WheelChart';
import MAVFPaywall from '@/components/mavf/MAVFPaywall';
import MAVFAppShell from '@/components/mavf/MAVFAppShell';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

export default function MAVFHistoricoPage({ adminViewUserId = null, adminClientLabel = '' }) {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentTier, setCurrentTier] = useState('DESPERTAR');
  const [sessions, setSessions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [responsesMap, setResponsesMap] = useState({});
  const adminMode = Boolean(adminViewUserId);
  const targetUserId = adminMode ? adminViewUserId : null;
  const backHref = adminMode ? `/admin/users/${encodeURIComponent(adminViewUserId)}/mavf` : '/mavf';

  useEffect(() => {
    bootstrap();
  }, [adminViewUserId]);

  const selectedSessions = useMemo(
    () => sessions.filter((session) => selectedIds.includes(session.id)),
    [sessions, selectedIds]
  );

  const bootstrap = async () => {
    try {
      const res = await fetch(withUserQuery('/api/mavf/sessions', targetUserId), { cache: 'no-store' });
      const data = await res.json();

      if (res.status === 403) {
        setAccessDenied(true);
        setCurrentTier(data.current_tier || 'DESPERTAR');
        setLoading(false);
        return;
      }

      const completedSessions = (data.sessions || []).filter((session) => session.status === 'completed');
      setSessions(completedSessions);

      const defaultSelected = completedSessions.slice(0, 3).map((session) => session.id);
      setSelectedIds(defaultSelected);

      await loadResponses(defaultSelected);
    } catch (error) {
      console.error('Erro ao carregar histórico MAVF:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (sessionIds) => {
    const entries = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const res = await fetch(withUserQuery(`/api/mavf/responses?session_id=${sessionId}`, targetUserId), {
          cache: 'no-store'
        });
        const data = await res.json();
        return [sessionId, data.responses || []];
      })
    );

    setResponsesMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  const toggleSession = async (sessionId) => {
    const currentlySelected = selectedIds.includes(sessionId);
    if (currentlySelected) {
      const next = selectedIds.filter((id) => id !== sessionId);
      setSelectedIds(next);
      return;
    }

    if (selectedIds.length >= 3) return;
    const next = [...selectedIds, sessionId];
    setSelectedIds(next);
    await loadResponses([sessionId]);
  };

  if (loading) {
    return (
      <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
        <div className="max-w-6xl mx-auto min-h-[50vh] flex items-center justify-center">
          <div className="text-[#888]">Carregando histórico...</div>
        </div>
      </MAVFAppShell>
    );
  }

  if (accessDenied) {
    return (
      <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
        <div className="max-w-6xl mx-auto">
          <MAVFPaywall currentTier={currentTier} />
        </div>
      </MAVFAppShell>
    );
  }

  return (
    <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
      <div className="max-w-6xl mx-auto text-[#fff]">
        {adminMode ? (
          <div className="mb-4 rounded-[10px] border border-[rgba(68,136,255,0.35)] bg-[rgba(68,136,255,0.1)] px-4 py-3 text-sm">
            <span className="font-semibold text-[#64b4ff]">Modo admin:</span>{' '}
            {adminClientLabel || 'histórico MAVF do cliente'}.
            <Link href="/admin" className="ml-3 underline text-[#9ec2ff]">
              Voltar ao painel
            </Link>
          </div>
        ) : null}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">MAVF Histórico</h1>
            <p className="text-[#888]">Selecione até 3 sessões finalizadas para comparar sua evolução.</p>
          </div>
          <Link href={backHref} className="px-4 py-2 border border-[#333333] rounded-[8px] text-sm text-[#aaa]">
            Voltar
          </Link>
        </div>

        <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-4 mb-6">
          <div className="text-xs uppercase tracking-[0.5px] text-[#888] mb-3">Sessões disponíveis</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {sessions.map((session) => {
              const checked = selectedIds.includes(session.id);
              const disabled = !checked && selectedIds.length >= 3;
              return (
                <label
                  key={session.id}
                  className={`flex items-center gap-3 p-3 rounded-[8px] border cursor-pointer ${
                    checked ? 'border-[#00C853] bg-[rgba(0,200,83,0.08)]' : 'border-[#333333] bg-[#1a1a1a]'
                  } ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleSession(session.id)}
                    className="accent-[#00C853]"
                  />
                  <span className="w-3 h-3 rounded-full border border-[#333]" style={{ background: session.color_hex }} />
                  <div>
                    <div className="text-sm font-semibold">{session.title}</div>
                    <div className="text-[11px] text-[#888]">
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {selectedSessions.length === 0 ? (
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-8 text-center text-[#888]">
            Selecione pelo menos uma sessão para visualizar a comparação.
          </div>
        ) : (
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-5 mb-6">
            <WheelChart sessions={selectedSessions} responsesMap={responsesMap} />
          </div>
        )}

        {selectedSessions.length > 0 ? (
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-4">
            <div className="text-xs uppercase tracking-[0.5px] text-[#888] mb-3">Legenda</div>
            <div className="flex flex-wrap gap-3">
              {selectedSessions.map((session) => (
                <div key={session.id} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-[8px] px-3 py-2">
                  <span className="w-3 h-3 rounded-full border border-[#333]" style={{ background: session.color_hex }} />
                  <span className="text-sm">{session.title}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </MAVFAppShell>
  );
}
