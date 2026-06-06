'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import AulaItem from '@/components/content/AulaItem';
import { useProgramDetail } from '@/hooks/useProgramDetail';

function sessionExpandedByDefault(session) {
  return (session?.aulas || []).some((aula) => aula?.progress?.started_at || aula?.progress?.completed_at);
}

export default function ProgramaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const programId = String(params?.id || '').trim();
  const { program, sessions, isLoading, error } = useProgramDetail(programId);
  const [manualExpanded, setManualExpanded] = useState({});

  const expandedState = useMemo(() => {
    const next = {};
    for (const session of sessions || []) {
      next[session.id] = Object.prototype.hasOwnProperty.call(manualExpanded, session.id)
        ? manualExpanded[session.id]
        : sessionExpandedByDefault(session);
    }
    return next;
  }, [manualExpanded, sessions]);

  const totalAulas = Number(program?.total_aulas || 0);
  const completed = Number(program?.aulas_concluidas || 0);
  const progress = Math.max(0, Math.min(100, Number(program?.progresso_pct || 0)));

  const toggleSession = (sessionId) => {
    setManualExpanded((current) => ({ ...current, [sessionId]: !expandedState[sessionId] }));
  };

  return (
    <div className="program-detail-screen">
      <header className="hero">
        <Link href="/conteudo" className="back-btn">
          ← voltar
        </Link>
        <div>
          <h1>{program?.title || 'Programa'}</h1>
          <p>
            {program?.sessions_count || sessions.length} sessões · {totalAulas} aulas
            {program?.turma_exclusiva ? ` · Turma ${program.turma_exclusiva}` : ''}
          </p>
        </div>
      </header>

      <main className="shell">
        {isLoading ? <div className="state-inline">Carregando programa...</div> : null}
        {!isLoading && error ? <div className="error-inline">{error}</div> : null}

        {!isLoading && !error && program ? (
          <>
            <section className="progress-card">
              <div className="progress-head">
                <strong>Seu progresso</strong>
                <span>
                  {completed} / {totalAulas} aulas concluídas
                </span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="sessions">
              {sessions.map((session) => {
                const isOpen = expandedState[session.id];
                return (
                  <article key={session.id} className="session-card">
                    <button type="button" className="session-head" onClick={() => toggleSession(session.id)}>
                      <span>📂 {session.title}</span>
                      <strong>
                        {session.aulas_concluidas || 0}/{session.total_aulas || 0} concluídas
                      </strong>
                    </button>

                    {isOpen ? (
                      <div className="aulas">
                        {(session.aulas || []).map((aula) => (
                          <AulaItem
                            key={aula.id}
                            aula={aula}
                            onClick={(selected) => router.push(`/conteudo/${programId}/${selected.id}`)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </>
        ) : null}
      </main>

      <BottomNav activeTab="inicio" />

      <style jsx>{`
        .program-detail-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding-bottom: calc(116px + env(safe-area-inset-bottom));
        }

        .hero {
          min-height: 210px;
          padding: 18px 14px 22px;
          background: linear-gradient(135deg, #082a17, #0e191f);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .back-btn {
          width: fit-content;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: var(--radius-full);
          color: var(--text);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
        }

        h1 {
          margin: 0 0 7px;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 900;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 13px;
        }

        .shell {
          max-width: 920px;
          margin: 0 auto;
          padding: 14px;
        }

        .progress-card,
        .session-card,
        .state-inline,
        .error-inline {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg2);
        }

        .progress-card {
          padding: 13px;
          margin-bottom: 12px;
        }

        .progress-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
          font-size: 13px;
        }

        .progress-head span {
          color: var(--text-2);
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        .progress-track {
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--bg3);
          overflow: hidden;
        }

        .progress-track span {
          display: block;
          height: 100%;
          background: var(--green);
        }

        .sessions {
          display: grid;
          gap: 10px;
        }

        .session-card {
          overflow: hidden;
        }

        .session-head {
          width: 100%;
          border: 0;
          background: transparent;
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px;
          cursor: pointer;
          text-align: left;
          font-weight: 900;
        }

        .session-head strong {
          color: var(--green);
          font-size: 12px;
          white-space: nowrap;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        .aulas {
          display: grid;
          gap: 8px;
          padding: 0 10px 10px;
        }

        .state-inline,
        .error-inline {
          padding: 10px 12px;
          color: var(--text-2);
          font-size: 13px;
        }

        .error-inline {
          border-color: color-mix(in srgb, var(--red) 28%, transparent);
          background: var(--red-dim);
          color: var(--red);
        }
      `}</style>
    </div>
  );
}
