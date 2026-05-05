'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MAVF_PILLARS } from '@/lib/mavf-config';
import QuestionSlider from '@/components/mavf/QuestionSlider';
import WheelChart from '@/components/mavf/WheelChart';
import MAVFPaywall from '@/components/mavf/MAVFPaywall';

export default function MAVFPage() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentTier, setCurrentTier] = useState('DESPERTAR');
  const [activeSession, setActiveSession] = useState(null);
  const [lastCompletedSession, setLastCompletedSession] = useState(null);
  const [responsesBySession, setResponsesBySession] = useState({});
  const [progress, setProgress] = useState({ completed: 0, total: 11, percentage: 0, all_completed: false });

  useEffect(() => {
    fetchData();
  }, []);

  const currentPillar = useMemo(() => {
    if (!activeSession?.current_pillar) return null;
    return MAVF_PILLARS.find((item) => item.id === activeSession.current_pillar) || null;
  }, [activeSession]);

  const fetchData = async () => {
    try {
      const resSessions = await fetch('/api/mavf/sessions', { cache: 'no-store' });
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
        const resResponses = await fetch(`/api/mavf/responses?session_id=${active.id}`, { cache: 'no-store' });
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
        const resResponses = await fetch(`/api/mavf/responses?session_id=${completed.id}`, { cache: 'no-store' });
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
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-[#fff]">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-[#888]">Carregando MAVF...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return <MAVFPaywall currentTier={currentTier} />;
  }

  if (!activeSession && !lastCompletedSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#1a1a1a] text-[#fff]">
        <div className="max-w-lg text-center bg-[#222222] border border-[#333333] rounded-[12px] p-8">
          <div className="text-6xl mb-6">💤</div>
          <h2 className="text-2xl font-bold mb-3">Nenhuma sessão MAVF ativa no momento</h2>
          <p className="text-[#888]">
            Aguarde o mentor iniciar a próxima sessão de autoavaliação.
          </p>
        </div>
      </div>
    );
  }

  if (!activeSession && lastCompletedSession) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-[#fff] p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">MAVF — {lastCompletedSession.title}</h1>
            <p className="text-[#888]">Sessão finalizada. Aqui está a revelação da sua roda.</p>
          </div>

          <div className="bg-[#222222] border border-[#333333] rounded-[12px] p-6 mb-6">
            <WheelChart sessions={[lastCompletedSession]} responsesMap={responsesBySession} />
          </div>

          <div className="text-center">
            <Link
              href="/mavf/historico"
              className="inline-flex bg-[#00C853] text-[#000] font-bold px-5 py-3 rounded-[8px]"
            >
              Comparar sessões anteriores
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeResponses = responsesBySession[activeSession.id] || [];

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8 text-[#fff]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">MAVF — {activeSession.title}</h1>
          <p className="text-[#888]">Responda cada pilar com sinceridade. A roda será revelada no final.</p>
        </div>

        <div className="mb-8 bg-[#222222] border border-[#333333] rounded-[12px] p-4">
          <div className="flex justify-between text-xs text-[#888] uppercase tracking-[0.5px] mb-2">
            <span>Progresso</span>
            <span>{progress.completed}/11 pilares</span>
          </div>
          <div className="bg-[#333] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00C853] to-[#69f0ae] h-full transition-all duration-500"
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
            />
          </div>
        ) : null}

        {!progress.all_completed && !currentPillar ? (
          <div className="mb-10 bg-[#222222] border border-[#333333] rounded-[12px] p-6 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h2 className="text-xl font-semibold mb-2">Aguardando próximo pilar</h2>
            <p className="text-[#888]">O mentor ainda vai liberar o próximo passo da sessão.</p>
          </div>
        ) : null}

        {progress.all_completed ? (
          <div className="mb-10 bg-[#222222] border border-[#333333] rounded-[12px] p-6 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-2xl font-bold mb-2">Respostas concluídas</h2>
            <p className="text-[#888]">Aguarde o mentor finalizar a sessão para revelar a roda.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {MAVF_PILLARS.map((pillar) => {
            const response = activeResponses.find((item) => item.pillar === pillar.id);
            const isCurrent = currentPillar?.id === pillar.id;
            return (
              <div
                key={pillar.id}
                className={`bg-[#222222] border rounded-[10px] p-3 text-center ${
                  isCurrent ? 'border-[#00C853]' : 'border-[#333333]'
                }`}
              >
                <div className="text-2xl mb-1">{pillar.emoji}</div>
                <div className="text-[11px] text-[#888] uppercase tracking-[0.5px] mb-1">{pillar.label}</div>
                <div className={`text-lg font-bold ${response ? 'text-[#00C853]' : 'text-[#555]'}`}>
                  {response?.score ?? '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
