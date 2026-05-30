'use client';

import Link from 'next/link';
import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import FeedEventCard from '@/components/community/FeedEventCard';
import CommunityStats from '@/components/community/CommunityStats';
import DesafioCard from '@/components/community/DesafioCard';
import FeedEmpty from '@/components/community/FeedEmpty';
import { useFeed } from '@/hooks/useFeed';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { useChallenge } from '@/hooks/useChallenge';

export default function TurmaPage() {
  const [isIAOpen, setIsIAOpen] = useState(false);
  const { events, turma, isLoading, hasMore, loadMore, react, refresh: refreshFeed } = useFeed();
  const { stats, isLoading: statsLoading } = useCommunityStats();
  const {
    challenge,
    participations,
    user_participated: userParticipated,
    progress_pct: progressPct,
    isLoading: challengeLoading
  } = useChallenge();

  const hasTurma = Boolean(String(turma || '').trim());
  const turmaNome = hasTurma ? String(turma).trim() : null;

  return (
    <div className="turma-screen">
      <AppHeader />

      <main className="turma-shell">
        <header className="turma-header">
          <div>
            <Link href="/app" className="back-link">
              ← voltar
            </Link>
            <h1 className="text-display">Turma 💪</h1>
            <p>{turmaNome ? `Turma ${turmaNome}` : 'Comunidade'}</p>
            <span className="context-label">{turmaNome ? `Vendo eventos da Turma ${turmaNome}` : 'Vendo todos os eventos'}</span>
          </div>
          <button type="button" className="refresh-btn" onClick={refreshFeed}>
            Atualizar
          </button>
        </header>

        <section className="turma-section">
          {statsLoading ? <div className="loading-inline">Carregando estatisticas...</div> : <CommunityStats stats={stats} />}
        </section>

        <section className="turma-section">
          {challengeLoading ? (
            <div className="loading-inline">Carregando desafio da semana...</div>
          ) : (
            <DesafioCard
              challenge={challenge}
              participations={participations}
              progressPct={progressPct}
              userParticipated={userParticipated}
            />
          )}
        </section>

        <section className="feed-list" aria-live="polite">
          {isLoading ? <div className="loading-inline">Carregando feed...</div> : null}
          {!isLoading && events.length === 0 ? (
            <FeedEmpty
              title={hasTurma ? 'Sua turma ainda esta aquecendo!' : 'Nenhum evento no feed ainda.'}
              description={
                hasTurma
                  ? 'Seja o primeiro a completar um mes ou registrar um grande ganho.'
                  : 'Quando os mentorados comecarem a compartilhar conquistas, elas aparecem aqui.'
              }
            />
          ) : null}

          {events.map((event) => (
            <FeedEventCard key={event.id} event={event} onReact={react} />
          ))}
        </section>

        {hasMore ? (
          <button type="button" className="load-more-btn" onClick={loadMore}>
            Carregar mais
          </button>
        ) : null}
      </main>

      <BottomNav activeTab="inicio" />
      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />

      <style jsx>{`
        .turma-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }

        .turma-shell {
          min-height: 100vh;
          max-width: 920px;
          margin: 0 auto;
          background: var(--bg);
          padding: 20px 14px calc(120px + env(safe-area-inset-bottom));
        }

        .turma-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .back-link {
          color: var(--text-2);
          text-decoration: none;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-weight: 700;
        }

        h1 {
          margin: 4px 0 4px;
          font-size: 22px;
          font-family: var(--font-body);
          font-weight: 900;
          line-height: 1.1;
        }

        p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .context-label {
          display: inline-block;
          margin-top: 6px;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .refresh-btn,
        .load-more-btn {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg2);
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
          padding: 9px 13px;
          cursor: pointer;
          transition: var(--transition);
        }

        .turma-section {
          margin-bottom: 14px;
        }

        .feed-list {
          display: grid;
          gap: 10px;
          margin-bottom: 12px;
        }

        .loading-inline {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg2);
          padding: 10px 12px;
          color: var(--text-2);
          font-size: 13px;
        }

        .load-more-btn {
          width: 100%;
        }

        @media (max-width: 760px) {
          .turma-shell {
            padding: 14px 10px calc(106px + env(safe-area-inset-bottom));
          }

          h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}
