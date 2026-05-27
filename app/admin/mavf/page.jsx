'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSessionCard from '@/components/mavf/AdminSessionCard';

const MAVF_ALLOWED_TIERS = ['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];

function isEligibleParticipant(user) {
  return Boolean(user?.status === 'active' && MAVF_ALLOWED_TIERS.includes(user?.tier));
}

export default function AdminMAVFPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [responseStats, setResponseStats] = useState({});

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  const [participantsModalSession, setParticipantsModalSession] = useState(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsSaving, setParticipantsSaving] = useState(false);
  const [participantsError, setParticipantsError] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [participantsQuery, setParticipantsQuery] = useState('');

  useEffect(() => {
    fetchAdminUsers();
    fetchSessions();
  }, []);

  const eligibleUsers = useMemo(() => users.filter((user) => isEligibleParticipant(user)), [users]);

  const filteredEligibleUsers = useMemo(() => {
    const query = participantsQuery.trim().toLowerCase();
    if (!query) return eligibleUsers;

    return eligibleUsers.filter((user) => {
      const name = String(user.full_name || '').toLowerCase();
      const email = String(user.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [eligibleUsers, participantsQuery]);

  const fetchAdminUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        setUsersError(data?.error || 'Erro ao carregar usuários.');
        return;
      }

      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (_) {
      setUsersError('Erro ao carregar usuários.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/mavf/sessions', { cache: 'no-store' });
      const data = await res.json();

      if (res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar sessões.');
      }

      setAccessDenied(false);
      const list = Array.isArray(data?.sessions) ? data.sessions : [];
      setSessions(list);

      const statsEntries = await Promise.all(
        list.map(async (session) => {
          try {
            const resStats = await fetch(`/api/mavf/responses?session_id=${session.id}&all=1`, { cache: 'no-store' });
            const dataStats = await resStats.json();
            if (!resStats.ok) throw new Error(dataStats?.error || 'Erro ao carregar estatísticas da sessão.');

            const responses = Array.isArray(dataStats?.responses) ? dataStats.responses : [];
            const countsByPillar = responses.reduce((acc, item) => {
              acc[item.pillar] = (acc[item.pillar] || 0) + 1;
              return acc;
            }, {});

            const assignedCount = Number(session?.participants_count || 0);
            return [
              session.id,
              {
                participantsCount: assignedCount > 0 ? assignedCount : dataStats.summary?.participants_count || 0,
                countsByPillar
              }
            ];
          } catch (_) {
            return [
              session.id,
              {
                participantsCount: Number(session?.participants_count || 0),
                countsByPillar: {}
              }
            ];
          }
        })
      );

      setResponseStats(Object.fromEntries(statsEntries));
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setFeedback(error?.message || 'Erro ao carregar sessões.');
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
      const data = await res.json();

      if (res.ok) {
        setFeedback('Sessão criada como rascunho. Defina os participantes e depois libere um pilar para ativar.');
        await fetchSessions();
      } else {
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

  const openParticipantsModal = async (session) => {
    setParticipantsModalSession(session);
    setParticipantsLoading(true);
    setParticipantsSaving(false);
    setParticipantsError('');
    setParticipantsQuery('');
    setSelectedParticipantIds([]);

    try {
      const res = await fetch(`/api/mavf/sessions/${session.id}/participants`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar participantes da sessão.');
      }

      const ids = (data?.participants || []).map((item) => item?.user_id).filter(Boolean);
      setSelectedParticipantIds(ids);
    } catch (error) {
      setParticipantsError(error?.message || 'Erro ao carregar participantes da sessão.');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const closeParticipantsModal = () => {
    if (participantsSaving) return;
    setParticipantsModalSession(null);
    setParticipantsError('');
    setSelectedParticipantIds([]);
    setParticipantsQuery('');
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipantIds((previous) => {
      if (previous.includes(userId)) return previous.filter((id) => id !== userId);
      return [...previous, userId];
    });
  };

  const saveParticipants = async () => {
    if (!participantsModalSession) return;

    setParticipantsSaving(true);
    setParticipantsError('');

    try {
      const res = await fetch(`/api/mavf/sessions/${participantsModalSession.id}/participants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedParticipantIds })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar participantes.');
      }

      const total = selectedParticipantIds.length;
      setSessions((previous) =>
        previous.map((item) => (item.id === participantsModalSession.id ? { ...item, participants_count: total } : item))
      );
      setResponseStats((previous) => ({
        ...previous,
        [participantsModalSession.id]: {
          ...(previous[participantsModalSession.id] || {}),
          participantsCount: total
        }
      }));

      setFeedback('Participantes da sessão atualizados com sucesso.');
      closeParticipantsModal();
    } catch (error) {
      setParticipantsError(error?.message || 'Erro ao salvar participantes.');
    } finally {
      setParticipantsSaving(false);
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
            <p className="text-[#888]">Crie a sessão, selecione os participantes e depois libere os pilares.</p>
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

        {usersError ? (
          <div className="mb-6 bg-[rgba(255,82,82,0.12)] border border-[rgba(255,82,82,0.28)] text-[#ff8e8e] rounded-[10px] p-3 text-sm">
            {usersError}
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
                onManageParticipants={openParticipantsModal}
              />
            ))}
          </div>
        ) : null}

        {draftSessions.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-[#FFD700]">Rascunhos (ainda não visíveis para mentorados)</h2>
            {draftSessions.map((session) => (
              <AdminSessionCard
                key={session.id}
                session={session}
                responseStats={responseStats[session.id]}
                onStartPillar={startPillar}
                onComplete={completeSession}
                onManageParticipants={openParticipantsModal}
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border border-[#333]" style={{ background: session.color_hex }} />
                      <div>
                        <div className="font-semibold">{session.title}</div>
                        <div className="text-xs text-[#888]">
                          Finalizada em {session.completed_at ? new Date(session.completed_at).toLocaleDateString('pt-BR') : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-[#888]">
                        {Number(session?.participants_count || responseStats[session.id]?.participantsCount || 0)} participantes liberados
                      </div>
                      <button
                        type="button"
                        onClick={() => openParticipantsModal(session)}
                        className="px-3 py-2 rounded-[8px] border border-[#64b4ff] text-[#64b4ff] text-xs font-semibold"
                      >
                        Participantes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {participantsModalSession ? (
        <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.72)] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#181818] border border-[#333] rounded-[14px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2c2c2c] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Participantes da Sessão</h3>
                <p className="text-xs text-[#9aa1ad] mt-1">{participantsModalSession.title}</p>
              </div>
              <button
                type="button"
                onClick={closeParticipantsModal}
                disabled={participantsSaving}
                className="px-3 py-2 text-xs border border-[#444] rounded-[8px] text-[#bbb] disabled:opacity-50"
              >
                Fechar
              </button>
            </div>

            <div className="px-5 py-4 border-b border-[#2c2c2c]">
              <div className="text-xs text-[#8da0b8] mb-2">
                Selecione quem pode visualizar e responder esta sessão. Apenas perfis `active` com tier MOVIMENTO+ aparecem aqui.
              </div>
              <input
                type="text"
                value={participantsQuery}
                onChange={(event) => setParticipantsQuery(event.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="w-full bg-[#101010] border border-[#343434] rounded-[8px] px-3 py-2 text-sm outline-none focus:border-[#64b4ff]"
              />
            </div>

            <div className="px-5 py-4 max-h-[52vh] overflow-y-auto">
              {usersLoading || participantsLoading ? (
                <div className="text-sm text-[#999]">Carregando participantes...</div>
              ) : filteredEligibleUsers.length === 0 ? (
                <div className="text-sm text-[#999]">Nenhum usuário elegível encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {filteredEligibleUsers.map((user) => {
                    const checked = selectedParticipantIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-[10px] border cursor-pointer ${
                          checked ? 'border-[#64b4ff] bg-[rgba(100,180,255,0.08)]' : 'border-[#2f2f2f] bg-[#141414]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(user.id)}
                            className="accent-[#64b4ff]"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{user.full_name || 'Sem nome'}</div>
                            <div className="text-xs text-[#98a0ad] truncate">{user.email || 'sem e-mail'}</div>
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.6px] text-[#7f8fa3]">{user.tier}</div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#2c2c2c]">
              {participantsError ? <div className="mb-3 text-sm text-[#ff8e8e]">{participantsError}</div> : null}
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-[#9aa1ad]">{selectedParticipantIds.length} participante(s) selecionado(s)</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeParticipantsModal}
                    disabled={participantsSaving}
                    className="px-3 py-2 text-xs border border-[#444] rounded-[8px] text-[#bbb] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveParticipants}
                    disabled={participantsSaving}
                    className="px-4 py-2 text-xs rounded-[8px] bg-[#64b4ff] text-[#06263f] font-bold disabled:opacity-60"
                  >
                    {participantsSaving ? 'Salvando...' : 'Salvar Participantes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
