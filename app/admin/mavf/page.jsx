'use client';

import { useEffect, useState } from 'react';
import AdminSessionCard from '@/components/mavf/AdminSessionCard';

export default function AdminMAVFPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [responseStats, setResponseStats] = useState({});

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/mavf/sessions', { cache: 'no-store' });
      const data = await res.json();

      if (res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setAccessDenied(false);
      const list = data.sessions || [];
      setSessions(list);

      const statsEntries = await Promise.all(
        list.map(async (session) => {
          const resStats = await fetch(`/api/mavf/responses?session_id=${session.id}&all=1`, { cache: 'no-store' });
          const dataStats = await resStats.json();
          const responses = dataStats.responses || [];
          const countsByPillar = responses.reduce((acc, item) => {
            acc[item.pillar] = (acc[item.pillar] || 0) + 1;
            return acc;
          }, {});

          return [
            session.id,
            {
              participantsCount: dataStats.summary?.participants_count || 0,
              countsByPillar
            }
          ];
        })
      );

      setResponseStats(Object.fromEntries(statsEntries));
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    const title = prompt('Nome da sessão MAVF:');
    if (!title) return;

    const colors = ['#00C853', '#2196F3', '#FFD700', '#E91E63', '#9C27B0', '#FF9800'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    setCreatingSession(true);
    setFeedback('');
    try {
      const res = await fetch('/api/mavf/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, color_hex: color })
      });

      if (res.ok) {
        setFeedback('Sessão criada com sucesso.');
        await fetchSessions();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar sessão');
      }
    } catch (_) {
      alert('Erro ao criar sessão');
    } finally {
      setCreatingSession(false);
    }
  };

  const startPillar = async (sessionId, pillarId) => {
    setFeedback('');
    try {
      const res = await fetch(`/api/mavf/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillar: pillarId })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Pilar liberado com sucesso.');
        await fetchSessions();
      } else {
        alert(data.error || 'Erro ao liberar pilar');
      }
    } catch (_) {
      alert('Erro ao liberar pilar');
    }
  };

  const completeSession = async (sessionId) => {
    if (!confirm('Finalizar esta sessão? Não poderá ser reaberta.')) return;

    setFeedback('');
    try {
      const res = await fetch(`/api/mavf/sessions/${sessionId}/complete`, {
        method: 'POST'
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(data.message || 'Sessão finalizada com sucesso.');
        await fetchSessions();
      } else {
        alert(data.error || 'Erro ao finalizar sessão');
      }
    } catch (_) {
      alert('Erro ao finalizar sessão');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-[#888]">Carregando...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-[#fff] flex items-center justify-center p-6">
        <div className="bg-[#222222] border border-[#333] rounded-[12px] p-7 max-w-md text-center">
          <div className="text-4xl mb-4">⛔</div>
          <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
          <p className="text-[#888] text-sm">Esta página é exclusiva para administradores.</p>
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter((item) => item.status === 'active');
  const completedSessions = sessions.filter((item) => item.status === 'completed');
  const draftSessions = sessions.filter((item) => item.status === 'draft');

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8 text-[#fff]">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">MAVF — Painel do Mentor</h1>
            <p className="text-[#888]">Controle de sessões de autoavaliação</p>
          </div>
          <button
            onClick={createSession}
            disabled={creatingSession}
            className="bg-[#00C853] text-[#000] font-bold px-6 py-3 rounded-[8px] disabled:opacity-50"
          >
            {creatingSession ? 'Criando...' : '+ Nova Sessão'}
          </button>
        </div>

        {feedback ? (
          <div className="mb-6 bg-[rgba(0,200,83,0.12)] border border-[rgba(0,200,83,0.28)] text-[#00C853] rounded-[10px] p-3 text-sm">
            {feedback}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-4">
            <div className="text-xs text-[#888] mb-1">Total de Sessões</div>
            <div className="text-3xl font-bold">{sessions.length}</div>
          </div>
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-4">
            <div className="text-xs text-[#888] mb-1">Ativas</div>
            <div className="text-3xl font-bold text-[#00C853]">{activeSessions.length}</div>
          </div>
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-4">
            <div className="text-xs text-[#888] mb-1">Rascunhos</div>
            <div className="text-3xl font-bold text-[#FFD700]">{draftSessions.length}</div>
          </div>
          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-4">
            <div className="text-xs text-[#888] mb-1">Finalizadas</div>
            <div className="text-3xl font-bold text-[#888]">{completedSessions.length}</div>
          </div>
        </div>

        {activeSessions.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-[#00C853] rounded-full" />
              Sessões Ativas
            </h2>
            {activeSessions.map((session) => (
              <AdminSessionCard
                key={session.id}
                session={session}
                responseStats={responseStats[session.id]}
                onStartPillar={startPillar}
                onComplete={completeSession}
              />
            ))}
          </div>
        ) : null}

        {draftSessions.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#FFD700]">Rascunhos</h2>
            {draftSessions.map((session) => (
              <AdminSessionCard
                key={session.id}
                session={session}
                responseStats={responseStats[session.id]}
                onStartPillar={startPillar}
                onComplete={completeSession}
              />
            ))}
          </div>
        ) : null}

        {completedSessions.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#888]">Sessões Finalizadas</h2>
            <div className="space-y-3">
              {completedSessions.map((session) => (
                <div key={session.id} className="bg-[#222222] border border-[#333333] rounded-[12px] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-[#333]" style={{ background: session.color_hex }} />
                      <div>
                        <div className="font-semibold">{session.title}</div>
                        <div className="text-xs text-[#888]">
                          Finalizada em {session.completed_at ? new Date(session.completed_at).toLocaleDateString('pt-BR') : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-[#888]">
                      {responseStats[session.id]?.participantsCount || 0} participantes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
