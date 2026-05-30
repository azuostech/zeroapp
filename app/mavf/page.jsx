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

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
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
    } catch (error) {
      console.error('Erro ao carregar dados MAVF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseSubmit = async (_, nextProgress) => {
    setProgress(nextProgress);
    await fetchData();
  };

  if (loading) {
    return (
      <>
        <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
          <div className="max-w-5xl mx-auto">
            <div className="min-h-[50vh] flex items-center justify-center text-[var(--text)]">
              <div className="text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-[var(--text-2)]">Carregando Minha Jornada...</p>
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
          <div className="max-w-5xl mx-auto">
            <MAVFPaywall currentTier={currentTier} />
          </div>
        </MAVFAppShell>
        {!adminMode ? <FAB onClick={() => setIsIAOpen(true)} /> : null}
        {!adminMode ? <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} /> : null}
      </>
    );
  }

  const activeResponses = activeSession ? responsesBySession[activeSession.id] || [] : [];
  const mapTitle = 'Minha Jornada 🌱';

  let mapContent = null;

  if (!activeSession && !lastCompletedSession) {
    mapContent = (
      <div className="max-w-lg text-center card card-green rounded-[18px] p-4 mx-auto">
        <div className="text-6xl mb-6">💤</div>
        <h2 className="text-2xl font-bold mb-3">Nenhuma sessão MAVF ativa no momento</h2>
        <p className="text-[var(--text-2)]">Aguarde o mentor iniciar a próxima sessão de autoavaliação.</p>
      </div>
    );
  } else if (!activeSession && lastCompletedSession) {
    mapContent = (
      <>
        <div className="card card-green rounded-[18px] p-4 mb-6">
          <WheelChart sessions={[lastCompletedSession]} responsesMap={responsesBySession} />
        </div>
        <div className="text-center">
          <Link href={mavfHistoryHref} className="inline-flex bg-[var(--green)] text-[var(--bg)] font-bold px-5 py-3 rounded-[8px]">
            Comparar sessões anteriores
          </Link>
        </div>
      </>
    );
  } else {
    mapContent = (
      <>
        <div className="mb-8 card card-green rounded-[18px] p-4">
          <div className="flex justify-between text-xs text-[var(--text-3)] uppercase tracking-[0.5px] mb-2">
            <span>Progresso</span>
            <span>{progress.completed}/11 pilares</span>
          </div>
          <div className="bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[var(--green)] to-[var(--green-2)] h-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {!progress.all_completed && currentPillar ? (
          <div className="mb-10">
            <QuestionSlider
              pillar={currentPillar}
              sessionId={activeSession.id}
              initialScore={activeResponses.find((item) => item.pillar === currentPillar.id)?.score || 5}
              onSubmit={handleResponseSubmit}
              targetUserId={targetUserId}
            />
          </div>
        ) : null}

        {!progress.all_completed && !currentPillar ? (
          <div className="mb-10 card card-green rounded-[18px] p-4 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h2 className="text-xl font-semibold mb-2">Aguardando próximo pilar</h2>
            <p className="text-[var(--text-2)]">O mentor ainda vai liberar o próximo passo da sessão.</p>
          </div>
        ) : null}

        {progress.all_completed ? (
          <div className="mb-10 card card-green rounded-[18px] p-4 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-2xl font-bold mb-2">Respostas concluídas</h2>
            <p className="text-[var(--text-2)]">Aguarde o mentor finalizar a sessão para revelar a roda.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {MAVF_PILLARS.map((pillar) => {
            const response = activeResponses.find((item) => item.pillar === pillar.id);
            const isCurrent = currentPillar?.id === pillar.id;
            return (
              <div
                key={pillar.id}
                className={`bg-[var(--bg-card)] border rounded-[10px] p-3 text-center ${
                  isCurrent ? 'border-[var(--green)]' : 'border-[var(--border-2)]'
                }`}
              >
                <div className="text-2xl mb-1">{pillar.emoji}</div>
                <div className="text-[11px] text-[var(--text-3)] uppercase tracking-[0.5px] mb-1">{pillar.label}</div>
                <div className={`text-lg font-bold ${response ? 'text-[var(--green)]' : 'text-[var(--text-3)]'}`}>
                  {response?.score ?? '—'}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
        <div className="max-w-5xl mx-auto text-[var(--text)]">
          {adminMode ? (
            <div className="mb-4 rounded-[10px] border border-[var(--blue)] bg-[var(--blue-dim)] px-4 py-3 text-sm">
              <span className="font-semibold text-[var(--blue)]">Modo admin:</span>{' '}
              {adminClientLabel || 'visualizando MAVF do cliente'}.
              <Link href="/admin" className="ml-3 underline text-[var(--blue)]">
                Voltar ao painel
              </Link>
            </div>
          ) : null}
          <div className="mb-6">
            <h1 className="text-[22px] md:text-[30px] font-black leading-[1.1] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
              {mapTitle}
            </h1>
            <p className="text-[13px] text-[var(--muted)]">Seus objetivos, práticas e evolução pessoal</p>
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

          <div className="mt-10">
            <div className="text-[10px] uppercase tracking-[1px] text-[var(--muted)] mb-2">Práticas Diárias</div>
            <h2 className="text-[22px] md:text-[26px] font-black mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Consistência que transforma
            </h2>
            <p className="text-[var(--text-2)] text-sm mb-5">
              Ganhos, gratidão e identidade. Três hábitos para consolidar sua evolução financeira no dia a dia.
            </p>

            {summaryError ? (
              <div className="mb-3 rounded-[10px] border border-[var(--red)] bg-[var(--red-dim)] px-4 py-3 text-sm text-[var(--red)]">
                {summaryError}
              </div>
            ) : null}

            {isSummaryLoading && !summary ? (
              <div className="mb-3 rounded-[10px] border border-[var(--border-2)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-2)]">
                Carregando resumo das práticas...
              </div>
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
