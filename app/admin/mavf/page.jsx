'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminSessionCard from '@/components/mavf/AdminSessionCard';

const MAVF_ALLOWED_TIERS = ['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];
const SESSION_COLORS = ['#00C853', '#2196F3', '#FFD700', '#E91E63', '#9C27B0', '#FF9800', '#12B0A5', '#FF6B6B'];

function isEligibleParticipant(user) {
  return Boolean(user?.status === 'active' && MAVF_ALLOWED_TIERS.includes(user?.tier));
}

function formatDateBR(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function pickRandomColor() {
  return SESSION_COLORS[Math.floor(Math.random() * SESSION_COLORS.length)];
}

export default function AdminMAVFPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [responseStats, setResponseStats] = useState({});

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  const [sessionModal, setSessionModal] = useState({ open: false, mode: 'create', session: null });
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionColor, setSessionColor] = useState('#00C853');
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [sessionFormError, setSessionFormError] = useState('');

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

  const activeSessions = useMemo(() => sessions.filter((item) => item.status === 'active'), [sessions]);
  const draftSessions = useMemo(() => sessions.filter((item) => item.status === 'draft'), [sessions]);
  const completedSessions = useMemo(() => sessions.filter((item) => item.status === 'completed'), [sessions]);

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

  const openCreateSessionModal = () => {
    setSessionModal({ open: true, mode: 'create', session: null });
    setSessionFormError('');
    setSessionTitle('');
    setSessionColor(pickRandomColor());
  };

  const openEditSessionModal = (session) => {
    setSessionModal({ open: true, mode: 'edit', session });
    setSessionFormError('');
    setSessionTitle(session?.title || '');
    setSessionColor(session?.color_hex || '#00C853');
  };

  const closeSessionModal = () => {
    if (sessionSubmitting) return;
    setSessionModal({ open: false, mode: 'create', session: null });
    setSessionFormError('');
    setSessionTitle('');
    setSessionColor('#00C853');
  };

  const saveSession = async () => {
    const title = String(sessionTitle || '').trim();
    if (title.length < 3) {
      setSessionFormError('Informe um título com pelo menos 3 caracteres.');
      return;
    }

    if (!/^#[0-9A-F]{6}$/i.test(sessionColor)) {
      setSessionFormError('Cor inválida. Use #RRGGBB.');
      return;
    }

    setSessionSubmitting(true);
    setSessionFormError('');
    setFeedback('');

    try {
      const isEditing = sessionModal.mode === 'edit' && sessionModal.session?.id;
      const endpoint = isEditing ? `/api/mavf/sessions/${sessionModal.session.id}` : '/api/mavf/sessions';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          color_hex: sessionColor
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar sessão.');
      }

      setFeedback(
        isEditing
          ? data?.message || 'Sessão atualizada com sucesso.'
          : data?.message || 'Sessão criada como rascunho. Defina participantes e libere o pilar.'
      );
      closeSessionModal();
      await fetchSessions();
    } catch (error) {
      setSessionFormError(error?.message || 'Erro ao salvar sessão.');
    } finally {
      setSessionSubmitting(false);
    }
  };

  const startPillar = async (sessionId, pillarId) => {
    const target = sessions.find((item) => item.id === sessionId);
    if (target?.status === 'completed') {
      const ok = window.confirm('Reativar esta sessão finalizada e liberar este pilar?');
      if (!ok) return;
    }

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
    if (!confirm('Finalizar esta sessão? Não poderá ser reaberta sem reativação manual.')) return;

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

  const deleteSession = async (session) => {
    const ok = window.confirm(
      `Excluir a sessão "${session?.title || 'sem título'}"?\n\nAs respostas vinculadas serão removidas e esta ação é irreversível.`
    );
    if (!ok) return;

    setFeedback('');
    try {
      const res = await fetch(`/api/mavf/sessions/${session.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback(data?.message || 'Sessão excluída com sucesso.');
        await fetchSessions();
      } else {
        alert(data?.error || 'Erro ao excluir sessão');
      }
    } catch (_) {
      alert('Erro ao excluir sessão');
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text2)]">
        Carregando painel MAVF...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[14px] p-7 max-w-md text-center shadow-[var(--shadow-sm)]">
          <div className="text-4xl mb-4">⛔</div>
          <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
          <p className="text-[var(--text2)] text-sm">Esta página é exclusiva para administradores.</p>
        </div>
      </div>
    );
  }

  const renderSessionSection = (title, subtitle, list, accentClass) => (
    <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4 md:p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className={`text-lg md:text-xl font-bold ${accentClass}`}>{title}</h2>
          <p className="text-xs md:text-sm text-[var(--text2)]">{subtitle}</p>
        </div>
        <div className="text-xs text-[var(--text2)]">{list.length} sessão(ões)</div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--bg-input)] p-5 text-sm text-[var(--text2)]">
          Nenhuma sessão nesta categoria.
        </div>
      ) : (
        list.map((session) => (
          <AdminSessionCard
            key={session.id}
            session={session}
            responseStats={responseStats[session.id]}
            onStartPillar={startPillar}
            onComplete={completeSession}
            onManageParticipants={openParticipantsModal}
            onEditSession={openEditSessionModal}
            onDeleteSession={deleteSession}
          />
        ))
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8 text-[var(--text)]">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="relative overflow-hidden rounded-[16px] border border-[var(--border-green)] bg-[var(--bg-header)] p-5 md:p-7 shadow-[var(--shadow-green)]">
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.9px] text-white/80 mb-2">Painel Operacional</p>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">MAVF Admin</h1>
              <p className="text-sm text-white/85 max-w-2xl">
                Gerencie sessões, participantes e pilares em um único fluxo. Reative sessões finalizadas quando necessário.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateSessionModal}
              className="px-5 py-3 rounded-[10px] bg-white/20 text-white border border-white/35 font-bold text-sm hover:bg-white/25"
            >
              + Nova Sessão
            </button>
          </div>
        </header>

        {feedback ? (
          <div className="rounded-[10px] border border-[rgba(61,213,152,0.35)] bg-[rgba(61,213,152,0.12)] text-[#95f5cb] px-4 py-3 text-sm">
            {feedback}
          </div>
        ) : null}

        {usersError ? (
          <div className="rounded-[10px] border border-[rgba(255,82,82,0.35)] bg-[rgba(255,82,82,0.12)] text-[#ff9f9f] px-4 py-3 text-sm">
            {usersError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] p-4 shadow-[var(--shadow-sm)]">
            <div className="text-xs text-[var(--text3)] mb-1">Total de Sessões</div>
            <div className="text-3xl font-bold">{sessions.length}</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-green)] rounded-[12px] p-4 shadow-[var(--shadow-sm)]">
            <div className="text-xs text-[var(--text3)] mb-1">Ativas</div>
            <div className="text-3xl font-bold text-[var(--green-dark)]">{activeSessions.length}</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--gold-mid)] rounded-[12px] p-4 shadow-[var(--shadow-sm)]">
            <div className="text-xs text-[var(--text3)] mb-1">Rascunhos</div>
            <div className="text-3xl font-bold text-[var(--gold-dark)]">{draftSessions.length}</div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] p-4 shadow-[var(--shadow-sm)]">
            <div className="text-xs text-[var(--text3)] mb-1">Finalizadas</div>
            <div className="text-3xl font-bold text-[var(--text2)]">{completedSessions.length}</div>
          </div>
        </div>

        <div className="space-y-5">
          {renderSessionSection(
            'Sessões Ativas',
            'Responder em tempo real e acompanhar volume de respostas por pilar.',
            activeSessions,
            'text-[#5fe5ad]'
          )}
          {renderSessionSection(
            'Rascunhos',
            'Defina participantes e configure os pilares antes de ativar.',
            draftSessions,
            'text-[#ffd166]'
          )}
          {renderSessionSection(
            'Sessões Finalizadas',
            'Você pode editar, excluir ou reativar selecionando um novo pilar.',
            completedSessions,
            'text-[#c4cfde]'
          )}
        </div>
      </div>

      {sessionModal.open ? (
        <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[14px] overflow-hidden shadow-[var(--shadow-lg)]">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold">{sessionModal.mode === 'edit' ? 'Editar Sessão' : 'Nova Sessão MAVF'}</h3>
              <p className="text-xs text-[var(--text2)] mt-1">
                {sessionModal.mode === 'edit'
                  ? 'Atualize nome e identidade visual da sessão.'
                  : 'Crie a sessão e depois selecione participantes para liberar acesso.'}
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <label className="block">
                <span className="text-xs text-[var(--text2)]">Título da sessão</span>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  placeholder="Ex.: Sessão de abril - turma A"
                  className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
                />
              </label>

              <div>
                <div className="text-xs text-[var(--text2)] mb-2">Cor da sessão</div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {SESSION_COLORS.map((color) => {
                    const active = sessionColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSessionColor(color)}
                        className={`h-8 w-8 rounded-full border-2 ${active ? 'border-[var(--green)]' : 'border-[var(--border)]'}`}
                        style={{ background: color }}
                        aria-label={`Selecionar cor ${color}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={sessionColor} onChange={(event) => setSessionColor(event.target.value)} className="h-9 w-12 rounded border border-[var(--border)] bg-transparent" />
                  <input
                    type="text"
                    value={sessionColor}
                    onChange={(event) => setSessionColor(event.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[var(--border)]">
              {sessionFormError ? <div className="mb-3 text-sm text-[#ff9f9f]">{sessionFormError}</div> : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSessionModal}
                  disabled={sessionSubmitting}
                  className="px-3 py-2 text-xs border border-[#3a4a5e] rounded-[8px] text-[#afbbc9] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveSession}
                  disabled={sessionSubmitting}
                  className="px-4 py-2 text-xs rounded-[8px] bg-[var(--green)] text-[var(--text-on-green)] font-bold disabled:opacity-60"
                >
                  {sessionSubmitting ? 'Salvando...' : sessionModal.mode === 'edit' ? 'Salvar Alterações' : 'Criar Sessão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {participantsModalSession ? (
        <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[14px] overflow-hidden shadow-[var(--shadow-lg)]">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Participantes da Sessão</h3>
                <p className="text-xs text-[var(--text2)] mt-1">
                  {participantsModalSession.title} • {formatDateBR(participantsModalSession.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeParticipantsModal}
                disabled={participantsSaving}
                className="px-3 py-2 text-xs border border-[var(--border)] rounded-[8px] text-[var(--text2)] disabled:opacity-50"
              >
                Fechar
              </button>
            </div>

            <div className="px-5 py-4 border-b border-[var(--border)]">
              <div className="text-xs text-[var(--text2)] mb-2">
                Selecione quem pode visualizar e responder esta sessão. Apenas perfis `active` com tier MOVIMENTO+ aparecem aqui.
              </div>
              <input
                type="text"
                value={participantsQuery}
                onChange={(event) => setParticipantsQuery(event.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-sm outline-none focus:border-[var(--green)]"
              />
            </div>

            <div className="px-5 py-4 max-h-[52vh] overflow-y-auto">
              {usersLoading || participantsLoading ? (
                <div className="text-sm text-[var(--text3)]">Carregando participantes...</div>
              ) : filteredEligibleUsers.length === 0 ? (
                <div className="text-sm text-[var(--text3)]">Nenhum usuário elegível encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {filteredEligibleUsers.map((user) => {
                    const checked = selectedParticipantIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-[10px] border cursor-pointer ${
                          checked ? 'border-[var(--green)] bg-[var(--green-dim)]' : 'border-[var(--border)] bg-[var(--bg-input)]'
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
