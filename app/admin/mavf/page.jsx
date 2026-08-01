'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAVF_PILLARS, MAVF_PILLARS_MAP } from '@/lib/mavf-config';
import styles from './admin-mavf.module.css';

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

const STATUS_META = {
  active: { label: 'Ao vivo', className: styles.statusActive },
  draft: { label: 'Preparação', className: styles.statusDraft },
  completed: { label: 'Finalizada', className: styles.statusCompleted }
};

export default function AdminMAVFPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [responseStats, setResponseStats] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

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
  const [operationSession, setOperationSession] = useState(null);

  useEffect(() => {
    fetchAdminUsers();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!operationSession?.id) return;
    const freshSession = sessions.find((item) => item.id === operationSession.id);
    if (freshSession) setOperationSession(freshSession);
  }, [sessions, operationSession?.id]);

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
        return false;
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
      setLastRefresh(new Date());
      return true;
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setFeedback(error?.message || 'Erro ao carregar sessões.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshLiveData = async () => {
    setRefreshing(true);
    setFeedback('');
    try {
      const refreshed = await fetchSessions();
      if (refreshed) setFeedback('Dados da sessão atualizados.');
    } finally {
      setRefreshing(false);
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
      if (!isEditing) setActiveSection('setup');
      setSessionModal({ open: false, mode: 'create', session: null });
      setSessionFormError('');
      setSessionTitle('');
      setSessionColor('#00C853');
      await fetchSessions();
      if (!isEditing && data?.session) await openParticipantsModal(data.session);
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
        setActiveSection('live');
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
        setActiveSection('history');
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
        if (operationSession?.id === session.id) setOperationSession(null);
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
      setOperationSession({
        ...(sessions.find((item) => item.id === participantsModalSession.id) || participantsModalSession),
        participants_count: total
      });
      setParticipantsModalSession(null);
      setParticipantsError('');
      setSelectedParticipantIds([]);
      setParticipantsQuery('');
    } catch (error) {
      setParticipantsError(error?.message || 'Erro ao salvar participantes.');
    } finally {
      setParticipantsSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando painel MAVF...</div>;
  }

  if (accessDenied) {
    return (
      <div className={styles.denied}>
        <div className={styles.deniedCard}>
          <div>⛔</div>
          <h2>Acesso restrito</h2>
          <p>Esta página é exclusiva para administradores.</p>
        </div>
      </div>
    );
  }

  const selectedSection = activeSection || (activeSessions.length > 0 ? 'live' : draftSessions.length > 0 ? 'setup' : 'history');
  const sectionTabs = [
    { id: 'live', label: 'Ao vivo', icon: '●', count: activeSessions.length },
    { id: 'setup', label: 'Preparação', icon: '⚙', count: draftSessions.length },
    { id: 'history', label: 'Histórico', icon: '✓', count: completedSessions.length }
  ];

  const sectionContent = {
    live: {
      title: 'Sessões em andamento',
      subtitle: 'Acompanhe respostas e abra o painel de operação para liberar pilares.',
      sessions: activeSessions,
      emptyIcon: '📡',
      emptyText: 'Nenhuma sessão está ao vivo agora.'
    },
    setup: {
      title: 'Sessões em preparação',
      subtitle: 'Defina participantes e configure a sessão antes de iniciar.',
      sessions: draftSessions,
      emptyIcon: '🧰',
      emptyText: 'Nenhuma sessão aguardando preparação.'
    },
    history: {
      title: 'Sessões já realizadas',
      subtitle: 'Consulte o histórico e as operações disponíveis para cada sessão.',
      sessions: completedSessions,
      emptyIcon: '📚',
      emptyText: 'Ainda não há sessões finalizadas.'
    }
  };

  const currentSection = sectionContent[selectedSection];
  const operationStats = operationSession ? responseStats[operationSession.id] || {} : {};
  const operationParticipants = Number(operationStats.participantsCount || operationSession?.participants_count || 0);
  const operationPillar = operationSession?.current_pillar ? MAVF_PILLARS_MAP[operationSession.current_pillar] : null;
  const operationResponseCount = operationPillar ? Number(operationStats.countsByPillar?.[operationPillar.id] || 0) : 0;
  const operationProgress = operationParticipants > 0 ? Math.min(100, Math.round((operationResponseCount / operationParticipants) * 100)) : 0;

  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Painel de operações administrativas</p>
            <h1>MAVF — Gestão de sessões</h1>
            <p className={styles.heroDescription}>
              Crie, prepare e conduza as sessões ao vivo em uma visão organizada, seguindo o padrão da gestão de usuários.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button type="button" onClick={refreshLiveData} disabled={refreshing} className={styles.buttonGhost}>
              {refreshing ? 'Atualizando...' : '↻ Atualizar painel'}
            </button>
            <button type="button" onClick={openCreateSessionModal} className={styles.buttonPrimary}>
              + Nova sessão
            </button>
          </div>
        </header>

        {feedback ? <div className={styles.notice}>{feedback}</div> : null}
        {usersError ? <div className={styles.errorNotice}>{usersError}</div> : null}

        <section className={styles.stats} aria-label="Resumo das sessões">
          <div className={styles.stat}><span>Total de sessões</span><strong>{sessions.length}</strong></div>
          <div className={styles.stat}><span>Ao vivo</span><strong>{activeSessions.length}</strong></div>
          <div className={styles.stat}><span>Em preparação</span><strong>{draftSessions.length}</strong></div>
          <div className={styles.stat}><span>Finalizadas</span><strong>{completedSessions.length}</strong></div>
        </section>

        <nav className={styles.tabs} aria-label="Filtrar sessões por status">
          {sectionTabs.map((tab) => {
            const selected = selectedSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
                aria-pressed={selected}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
                <span className={styles.tabCount}>{tab.count}</span>
              </button>
            );
          })}
        </nav>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>{currentSection.title}</h2>
              <p>{currentSection.subtitle}</p>
            </div>
            <span className={styles.lastUpdate}>
              {lastRefresh ? `Atualizado às ${lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </div>

          {currentSection.sessions.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>{currentSection.emptyIcon}</div>
              {currentSection.emptyText}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sessão</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Participantes</th>
                    <th>Pilar atual</th>
                    <th>Respostas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSection.sessions.map((session) => {
                    const status = STATUS_META[session.status] || STATUS_META.draft;
                    const stats = responseStats[session.id] || {};
                    const participants = Number(stats.participantsCount || session.participants_count || 0);
                    const pillar = session.current_pillar ? MAVF_PILLARS_MAP[session.current_pillar] : null;
                    const responseCount = pillar ? Number(stats.countsByPillar?.[pillar.id] || 0) : 0;
                    return (
                      <tr key={session.id}>
                        <td>
                          <div className={styles.sessionName}>
                            <span className={styles.sessionColor} style={{ background: session.color_hex }} />
                            <span>{session.title}</span>
                          </div>
                          <span className={styles.sessionMeta}>ID {String(session.id).slice(0, 8)}</span>
                        </td>
                        <td><span className={`${styles.badge} ${status.className}`}>● {status.label}</span></td>
                        <td>{formatDateBR(session.completed_at || session.started_at || session.created_at)}</td>
                        <td><strong>{participants}</strong></td>
                        <td>{pillar ? `${pillar.emoji} ${pillar.label}` : '—'}</td>
                        <td>{session.status === 'active' ? `${responseCount}/${participants}` : '—'}</td>
                        <td>
                          <div className={styles.actions}>
                            <button type="button" className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={() => setOperationSession(session)}>
                              {session.status === 'active' ? 'Operar' : session.status === 'draft' ? 'Configurar' : 'Detalhes'}
                            </button>
                            <button type="button" className={styles.actionButton} onClick={() => openParticipantsModal(session)}>Participantes</button>
                            <button type="button" className={styles.actionButton} onClick={() => openEditSessionModal(session)}>Editar</button>
                            <button type="button" className={styles.actionDanger} onClick={() => deleteSession(session)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {operationSession ? (
        <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOperationSession(null)}>
          <section className={styles.modalWide} role="dialog" aria-modal="true" aria-labelledby="operation-title">
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Painel de operação</p>
                <h2 id="operation-title">{operationSession.title}</h2>
                <p>{STATUS_META[operationSession.status]?.label} • criada em {formatDateBR(operationSession.created_at)}</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setOperationSession(null)} aria-label="Fechar">×</button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.operationSummary}>
                <div className={styles.operationStat}><span>Status</span><strong>{STATUS_META[operationSession.status]?.label}</strong></div>
                <div className={styles.operationStat}><span>Participantes</span><strong>{operationParticipants}</strong></div>
                <div className={styles.operationStat}><span>Pilar atual</span><strong>{operationPillar ? `${operationPillar.emoji} ${operationPillar.label}` : 'Nenhum'}</strong></div>
              </div>

              {operationSession.status === 'active' ? (
                <div className={styles.liveBox}>
                  <span>Respostas recebidas no pilar atual</span>
                  <strong>{operationResponseCount} de {operationParticipants}</strong>
                  <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${operationProgress}%` }} /></div>
                </div>
              ) : null}

              {operationSession.status === 'draft' ? (
                <div className={styles.setupBox}>
                  <span>Preparação da sessão</span>
                  <strong>{operationParticipants > 0 ? 'Participantes definidos' : 'Defina os participantes'}</strong>
                  <p>Ao liberar o primeiro pilar, a sessão ficará ativa para os participantes selecionados.</p>
                </div>
              ) : null}

              {operationSession.status === 'completed' ? (
                <div className={styles.setupBox}>
                  <span>Sessão concluída</span>
                  <strong>Histórico preservado</strong>
                  <p>Use os pilares abaixo somente se precisar reativar excepcionalmente esta sessão.</p>
                </div>
              ) : null}

              <h3 className={styles.pillarsTitle}>
                {operationSession.status === 'active' ? 'Liberar pilar durante a sessão' : operationSession.status === 'draft' ? 'Escolha o primeiro pilar' : 'Reativar em um pilar'}
              </h3>
              <div className={styles.pillars}>
                {MAVF_PILLARS.map((pillar) => {
                  const active = operationSession.current_pillar === pillar.id;
                  const count = Number(operationStats.countsByPillar?.[pillar.id] || 0);
                  return (
                    <button
                      key={pillar.id}
                      type="button"
                      className={`${styles.pillar} ${active ? styles.pillarActive : ''}`}
                      onClick={() => startPillar(operationSession.id, pillar.id)}
                    >
                      <strong>{pillar.emoji} {pillar.label}</strong>
                      <span>{active ? 'Liberado agora' : `${count} resposta(s)`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <footer className={styles.modalFooter}>
              <div className={styles.operationActions}>
                <button type="button" className={styles.button} onClick={() => openParticipantsModal(operationSession)}>Participantes</button>
                <button type="button" className={styles.button} onClick={() => { setOperationSession(null); openEditSessionModal(operationSession); }}>Editar sessão</button>
                {operationSession.status === 'active' ? <button type="button" className={styles.buttonDanger} onClick={() => completeSession(operationSession.id)}>Finalizar sessão</button> : null}
              </div>
              <button type="button" className={styles.buttonGhost} onClick={() => setOperationSession(null)}>Fechar</button>
            </footer>
          </section>
        </div>
      ) : null}

      {sessionModal.open ? (
        <div className={`${styles.overlay} ${styles.overlayFront}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeSessionModal()}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="session-modal-title">
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>{sessionModal.mode === 'edit' ? 'Configuração' : 'Nova sessão'}</p>
                <h2 id="session-modal-title">{sessionModal.mode === 'edit' ? 'Editar sessão' : 'Criar sessão MAVF'}</h2>
                <p>
                {sessionModal.mode === 'edit'
                  ? 'Atualize nome e identidade visual da sessão.'
                  : 'A sessão será criada em preparação. Depois, defina participantes e libere o primeiro pilar.'}
                </p>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeSessionModal} aria-label="Fechar">×</button>
            </header>

            <div className={styles.modalBody}>
              {sessionModal.mode === 'create' ? (
                <div className={styles.steps}>
                  <div className={`${styles.step} ${styles.stepActive}`}>1. Criar sessão</div>
                  <div className={styles.step}>2. Participantes</div>
                  <div className={styles.step}>3. Liberar pilar</div>
                </div>
              ) : null}

              <div className={styles.field}>
                <label htmlFor="session-title">Título da sessão</label>
                <input
                  id="session-title"
                  type="text"
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  placeholder="Ex.: Sessão de abril - turma A"
                  className={styles.input}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Cor da sessão</div>
                <div className={styles.colorGrid}>
                  {SESSION_COLORS.map((color) => {
                    const active = sessionColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSessionColor(color)}
                        className={`${styles.colorButton} ${active ? styles.colorButtonActive : ''}`}
                        style={{ background: color }}
                        aria-label={`Selecionar cor ${color}`}
                      />
                    );
                  })}
                </div>
                <div className={styles.customColor}>
                  <input type="color" value={sessionColor} onChange={(event) => setSessionColor(event.target.value)} aria-label="Escolher cor personalizada" />
                  <input
                    type="text"
                    value={sessionColor}
                    onChange={(event) => setSessionColor(event.target.value)}
                    className={styles.input}
                    aria-label="Código hexadecimal da cor"
                  />
                </div>
              </div>
            </div>

            <footer className={styles.modalFooter}>
              <div>{sessionFormError ? <div className={styles.errorNotice}>{sessionFormError}</div> : null}</div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeSessionModal} disabled={sessionSubmitting} className={styles.button}>Cancelar</button>
                <button type="button" onClick={saveSession} disabled={sessionSubmitting} className={styles.buttonPrimary}>
                  {sessionSubmitting ? 'Salvando...' : sessionModal.mode === 'edit' ? 'Salvar alterações' : 'Criar sessão'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {participantsModalSession ? (
        <div className={`${styles.overlay} ${styles.overlayFront}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeParticipantsModal()}>
          <section className={styles.modalWide} role="dialog" aria-modal="true" aria-labelledby="participants-title">
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Controle de acesso</p>
                <h2 id="participants-title">Participantes da sessão</h2>
                <p>{participantsModalSession.title} • {formatDateBR(participantsModalSession.created_at)}</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeParticipantsModal} disabled={participantsSaving} aria-label="Fechar">×</button>
            </header>

            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label htmlFor="participants-search">Buscar participantes elegíveis</label>
                <input
                  id="participants-search"
                  type="text"
                  value={participantsQuery}
                  onChange={(event) => setParticipantsQuery(event.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className={styles.input}
                  autoFocus
                />
                <span className={styles.sessionMeta}>Apenas usuários ativos com tier MOVIMENTO ou superior.</span>
              </div>

              {usersLoading || participantsLoading ? (
                <div className={styles.empty}>Carregando participantes...</div>
              ) : filteredEligibleUsers.length === 0 ? (
                <div className={styles.empty}>Nenhum usuário elegível encontrado.</div>
              ) : (
                <div className={styles.participantsList}>
                  {filteredEligibleUsers.map((user) => {
                    const checked = selectedParticipantIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`${styles.participant} ${checked ? styles.participantSelected : ''}`}
                      >
                        <div className={styles.participantInfo}>
                          <input type="checkbox" checked={checked} onChange={() => toggleParticipant(user.id)} />
                          <div className={styles.participantText}>
                            <strong>{user.full_name || 'Sem nome'}</strong>
                            <span>{user.email || 'sem e-mail'}</span>
                          </div>
                        </div>
                        <div className={styles.tier}>{user.tier}</div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className={styles.modalFooter}>
              <div>
                <div className={styles.footerCount}>{selectedParticipantIds.length} participante(s) selecionado(s)</div>
                {participantsError ? <div className={styles.errorNotice}>{participantsError}</div> : null}
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeParticipantsModal} disabled={participantsSaving} className={styles.button}>Cancelar</button>
                <button type="button" onClick={saveParticipants} disabled={participantsSaving} className={styles.buttonPrimary}>
                  {participantsSaving ? 'Salvando...' : 'Salvar participantes'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
