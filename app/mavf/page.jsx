'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MAVF_PILLARS } from '@/lib/mavf-config';
import QuestionSlider from '@/components/mavf/QuestionSlider';
import WheelChart from '@/components/mavf/WheelChart';
import MAVFPaywall from '@/components/mavf/MAVFPaywall';
import MAVFTabs from '@/components/mavf/MAVFTabs';
import ObjectivesList from '@/components/mavf/ObjectivesList';
import MAVFAppShell from '@/components/mavf/MAVFAppShell';
import GanhosCard from '@/components/mavf/GanhosCard';
import GratidaoCard from '@/components/mavf/GratidaoCard';
import IdentidadeCard from '@/components/mavf/IdentidadeCard';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import { useMavfSummary } from '@/hooks/useMavfSummary';
import styles from './mavf.module.css';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

function SessionRefreshButton({ onRefresh, loading, message, lastChecked, compact = false }) {
  return (
    <div className={styles.refreshWrap} data-compact={compact || undefined}>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className={styles.primaryButton}
      >
        <span aria-hidden="true">↻</span>{' '}
        {loading ? 'Buscando atualização...' : 'Atualizar sessão'}
      </button>
      {message ? <p className={styles.refreshMessage} role="status">{message}</p> : null}
      {lastChecked ? (
        <p className={styles.lastChecked}>
          Última consulta às {lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      ) : null}
    </div>
  );
}

export default function MAVFPage({ adminViewUserId = null, adminClientLabel = '' }) {
  const [activeTab, setActiveTab] = useState('mapa');
  const [expandedPractice, setExpandedPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentTier, setCurrentTier] = useState('DESPERTAR');
  const [activeSession, setActiveSession] = useState(null);
  const [lastCompletedSession, setLastCompletedSession] = useState(null);
  const [responsesBySession, setResponsesBySession] = useState({});
  const [progress, setProgress] = useState({ completed: 0, total: 11, percentage: 0, all_completed: false });
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [lastSessionCheck, setLastSessionCheck] = useState(null);
  const [isIAOpen, setIsIAOpen] = useState(false);
  const adminMode = Boolean(adminViewUserId);
  const targetUserId = adminMode ? adminViewUserId : null;
  const { summary, isLoading: isSummaryLoading, error: summaryError, refresh: refreshSummary } = useMavfSummary(targetUserId);
  const mavfHistoryHref = adminMode
    ? `/admin/users/${encodeURIComponent(adminViewUserId)}/mavf/historico`
    : '/mavf/historico';

  useEffect(() => {
    fetchData();
  }, [adminViewUserId]);

  const currentPillar = useMemo(() => {
    if (!activeSession?.current_pillar) return null;
    return MAVF_PILLARS.find((item) => item.id === activeSession.current_pillar) || null;
  }, [activeSession]);

  const fetchData = async () => {
    try {
      const resSessions = await fetch(withUserQuery('/api/mavf/sessions', targetUserId), { cache: 'no-store' });
      const dataSessions = await resSessions.json();

      if (resSessions.status === 403) {
        setAccessDenied(true);
        setCurrentTier(dataSessions.current_tier || 'DESPERTAR');
        setLoading(false);
        return;
      }

      setAccessDenied(false);
      const sessions = dataSessions.sessions || [];
      const active = sessions.find((item) => item.status === 'active') || null;
      const completed = sessions.find((item) => item.status === 'completed') || null;

      setActiveSession(active);
      setLastCompletedSession(completed);

      const nextResponsesMap = {};

      if (active) {
        const resResponses = await fetch(withUserQuery(`/api/mavf/responses?session_id=${active.id}`, targetUserId), {
          cache: 'no-store'
        });
        const dataResponses = await resResponses.json();
        const responses = dataResponses.responses || [];
        nextResponsesMap[active.id] = responses;

        const completedCount = responses.length;
        setProgress({
          completed: completedCount,
          total: 11,
          percentage: Math.round((completedCount / 11) * 100),
          all_completed: completedCount === 11
        });
      } else if (completed) {
        const resResponses = await fetch(withUserQuery(`/api/mavf/responses?session_id=${completed.id}`, targetUserId), {
          cache: 'no-store'
        });
        const dataResponses = await resResponses.json();
        nextResponsesMap[completed.id] = dataResponses.responses || [];
        setProgress({ completed: 0, total: 11, percentage: 0, all_completed: false });
      } else {
        setProgress({ completed: 0, total: 11, percentage: 0, all_completed: false });
      }

      setResponsesBySession(nextResponsesMap);
      return { activeSession: active, sessions };
    } catch (error) {
      console.error('Erro ao carregar dados MAVF:', error);
      setRefreshMessage('Não foi possível atualizar agora. Verifique sua conexão e tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleResponseSubmit = async (_, nextProgress) => {
    setProgress(nextProgress);
    await fetchData();
  };

  const handleRefreshSession = async () => {
    setRefreshingSession(true);
    setRefreshMessage('');

    const previousSessionId = activeSession?.id || null;
    const previousPillar = activeSession?.current_pillar || null;

    try {
      const result = await fetchData();
      if (!result) {
        setLastSessionCheck(new Date());
        return;
      }
      const nextSession = result?.activeSession || null;
      const changed = nextSession?.id !== previousSessionId || nextSession?.current_pillar !== previousPillar;

      setRefreshMessage(changed ? 'Atualização encontrada! A sessão foi sincronizada.' : 'Tudo certo. O mentor ainda não liberou o próximo pilar.');
      setLastSessionCheck(new Date());
    } finally {
      setRefreshingSession(false);
    }
  };

  if (loading) {
    return (
      <>
        <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
          <div className={styles.page}>
            <div className={styles.loading}>
              <div>
                <span className={styles.loadingIcon}>⏳</span>
                <p>Carregando Minha Jornada...</p>
              </div>
            </div>
          </div>
        </MAVFAppShell>
        {!adminMode ? <FAB onClick={() => setIsIAOpen(true)} /> : null}
        {!adminMode ? <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} /> : null}
      </>
    );
  }

  if (accessDenied) {
    return (
      <>
        <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
          <div className={styles.page}>
            <MAVFPaywall currentTier={currentTier} />
          </div>
        </MAVFAppShell>
        {!adminMode ? <FAB onClick={() => setIsIAOpen(true)} /> : null}
        {!adminMode ? <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} /> : null}
      </>
    );
  }

  const activeResponses = activeSession ? responsesBySession[activeSession.id] || [] : [];
  const currentResponse = currentPillar
    ? activeResponses.find((item) => item.pillar === currentPillar.id) || null
    : null;
  const mapTitle = 'Minha Jornada 🌱';

  let mapContent = null;

  if (!activeSession && !lastCompletedSession) {
    mapContent = (
      <div className={styles.stateCard}>
        <div className={styles.stateIcon}>💤</div>
        <h2>Nenhuma sessão MAVF ativa</h2>
        <p>Aguarde o mentor iniciar a próxima sessão de autoavaliação.</p>
        {!adminMode ? (
          <SessionRefreshButton
            onRefresh={handleRefreshSession}
            loading={refreshingSession}
            message={refreshMessage}
            lastChecked={lastSessionCheck}
          />
        ) : null}
      </div>
    );
  } else if (!activeSession && lastCompletedSession) {
    mapContent = (
      <div className={styles.mapStack}>
        <div className={styles.chartCard}>
          <WheelChart sessions={[lastCompletedSession]} responsesMap={responsesBySession} />
        </div>
        <div className={styles.centerActions}>
          <Link href={mavfHistoryHref} className={styles.primaryButton}>
            Comparar sessões anteriores
          </Link>
        </div>
      </div>
    );
  } else {
    mapContent = (
      <div className={styles.mapStack}>
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div>
              <span>Sessão em andamento</span>
              <strong>{activeSession.title}</strong>
            </div>
            <div className={styles.progressCount}>{progress.completed}/11 pilares</div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress.percentage}%` }} />
          </div>
        </div>

        {!progress.all_completed && currentPillar && !currentResponse ? (
          <QuestionSlider
            key={`${activeSession.id}:${currentPillar.id}`}
            pillar={currentPillar}
            sessionId={activeSession.id}
            initialScore={null}
            onSubmit={handleResponseSubmit}
            targetUserId={targetUserId}
          />
        ) : null}

        {!progress.all_completed && currentPillar && currentResponse ? (
          <div className={styles.stateCard}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.stateEyebrow}>Resposta confirmada</p>
            <h2>
              {currentPillar.emoji} {currentPillar.label}: {currentResponse.score}
            </h2>
            <p>
              Sua resposta está salva. Quando o mentor liberar o próximo pilar, toque no botão abaixo para continuar.
            </p>
            {!adminMode ? (
              <SessionRefreshButton
                onRefresh={handleRefreshSession}
                loading={refreshingSession}
                message={refreshMessage}
                lastChecked={lastSessionCheck}
              />
            ) : null}
          </div>
        ) : null}

        {!progress.all_completed && !currentPillar ? (
          <div className={styles.stateCard}>
            <div className={styles.stateIcon}>🎯</div>
            <h2>Aguardando próximo pilar</h2>
            <p>O mentor ainda vai liberar o próximo passo da sessão.</p>
            {!adminMode ? (
              <SessionRefreshButton
                onRefresh={handleRefreshSession}
                loading={refreshingSession}
                message={refreshMessage}
                lastChecked={lastSessionCheck}
                compact
              />
            ) : null}
          </div>
        ) : null}

        {progress.all_completed ? (
          <div className={styles.stateCard}>
            <div className={styles.stateIcon}>✅</div>
            <h2>Respostas concluídas</h2>
            <p>Aguarde o mentor finalizar a sessão para revelar a roda.</p>
            {!adminMode ? (
              <SessionRefreshButton
                onRefresh={handleRefreshSession}
                loading={refreshingSession}
                message={refreshMessage}
                lastChecked={lastSessionCheck}
                compact
              />
            ) : null}
          </div>
        ) : null}

        <section className={styles.pillarsPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Mapa dos pilares</h2>
              <p>Acompanhe o que já foi respondido e o que ainda será liberado.</p>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.pillarTable}>
              <thead><tr><th>Pilar</th><th>Status</th><th>Nota</th></tr></thead>
              <tbody>
                {MAVF_PILLARS.map((pillar) => {
                  const response = activeResponses.find((item) => item.pillar === pillar.id);
                  const isCurrent = currentPillar?.id === pillar.id;
                  const statusClass = isCurrent
                    ? `${styles.statusChip} ${styles.statusCurrent}`
                    : response
                      ? `${styles.statusChip} ${styles.statusAnswered}`
                      : styles.statusChip;
                  return (
                    <tr key={pillar.id} className={isCurrent ? styles.currentRow : ''}>
                      <td><div className={styles.pillarName}><span className={styles.pillarEmoji}>{pillar.emoji}</span>{pillar.label}</div></td>
                      <td><span className={statusClass}>{isCurrent ? 'Atual' : response ? 'Respondido' : 'Aguardando'}</span></td>
                      <td><span className={response ? styles.score : ''}>{response?.score ?? '—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
        <div className={styles.page}>
          {adminMode ? (
            <div className={styles.adminBanner}>
              <strong>Modo admin:</strong>{' '}
              {adminClientLabel || 'visualizando MAVF do cliente'}.
              <Link href="/admin">
                Voltar ao painel
              </Link>
            </div>
          ) : null}
          <div className={styles.pageHeader}>
            <div>
              <h1>{mapTitle}</h1>
              <p>Seus objetivos, práticas e evolução pessoal</p>
            </div>
            {!adminMode && activeTab === 'mapa' ? (
              <button
                type="button"
                onClick={handleRefreshSession}
                disabled={refreshingSession}
                className={styles.refreshButton}
              >
                <span aria-hidden="true">↻</span>{' '}
                {refreshingSession ? 'Atualizando...' : 'Atualizar sessão'}
              </button>
            ) : null}
          </div>

          <MAVFTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'mapa' ? (
            mapContent
          ) : (
            <ObjectivesList
              sessionId={activeSession?.id || lastCompletedSession?.id || null}
              targetUserId={targetUserId}
              adminMode={adminMode}
            />
          )}

          <div className={styles.practiceSection}>
            <p className={styles.sectionEyebrow}>Práticas diárias</p>
            <h2>Consistência que transforma</h2>
            <p className={styles.sectionDescription}>
              Ganhos, gratidão e identidade. Três hábitos para consolidar sua evolução financeira no dia a dia.
            </p>

            {summaryError ? (
              <div className={styles.errorNotice}>{summaryError}</div>
            ) : null}

            {isSummaryLoading && !summary ? (
              <div className={styles.notice}>Carregando resumo das práticas...</div>
            ) : null}

            <GanhosCard
              summary={summary?.gains}
              expanded={expandedPractice === 'ganhos'}
              onToggle={() => setExpandedPractice((prev) => (prev === 'ganhos' ? null : 'ganhos'))}
              onUpdate={refreshSummary}
              targetUserId={targetUserId}
            />

            <GratidaoCard
              summary={summary?.gratitude}
              expanded={expandedPractice === 'gratidao'}
              onToggle={() => setExpandedPractice((prev) => (prev === 'gratidao' ? null : 'gratidao'))}
              onUpdate={refreshSummary}
              targetUserId={targetUserId}
            />

            <IdentidadeCard
              summary={summary?.identity}
              expanded={expandedPractice === 'identidade'}
              onToggle={() => setExpandedPractice((prev) => (prev === 'identidade' ? null : 'identidade'))}
              onUpdate={refreshSummary}
              targetUserId={targetUserId}
            />
          </div>
        </div>
      </MAVFAppShell>
      {!adminMode ? <FAB onClick={() => setIsIAOpen(true)} /> : null}
      {!adminMode ? <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} /> : null}
    </>
  );
}
