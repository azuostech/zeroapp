'use client';

import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import FeedEventCard from '@/components/community/FeedEventCard';
import CommunityStats from '@/components/community/CommunityStats';
import DesafioCard from '@/components/community/DesafioCard';
import FeedEmpty from '@/components/community/FeedEmpty';
import { useFeed } from '@/hooks/useFeed';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { useChallenge } from '@/hooks/useChallenge';

export default function TurmaPage() {
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
            <h1>Turma 💪</h1>
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

      <style jsx>{`
        :global(html[data-theme='dark']) {
          --turma-bg: #0b0d0f;
          --turma-text: #f3f3f3;
          --turma-muted: #98a0a8;
          --turma-card: #141619;
          --turma-border: #2f363d;
          --turma-positive: #00c853;
        }

        :global(html[data-theme='light']) {
          --turma-bg: #f3f6f8;
          --turma-text: #182129;
          --turma-muted: #62707c;
          --turma-card: #ffffff;
          --turma-border: #d3dde6;
          --turma-positive: #0b8a46;
        }

        .turma-screen {
          min-height: 100vh;
          background: var(--turma-bg, #0b0d0f);
          color: var(--turma-text, #f3f3f3);
        }

        .turma-shell {
          max-width: 920px;
          margin: 0 auto;
          padding: 20px 14px calc(98px + env(safe-area-inset-bottom));
        }

        .turma-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .back-link {
          color: var(--turma-muted, #98a0a8);
          text-decoration: none;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-weight: 700;
        }

        h1 {
          margin: 4px 0 4px;
          font-size: 30px;
          line-height: 1.1;
        }

        p {
          margin: 0;
          color: var(--turma-muted, #98a0a8);
          font-size: 14px;
        }

        .context-label {
          display: inline-block;
          margin-top: 6px;
          color: var(--turma-muted, #98a0a8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-weight: 700;
        }

        .refresh-btn,
        .load-more-btn {
          border: 1px solid var(--turma-border, #2f363d);
          border-radius: 11px;
          background: var(--turma-card, #141619);
          color: var(--turma-text, #f3f3f3);
          font-size: 13px;
          font-weight: 700;
          padding: 9px 13px;
          cursor: pointer;
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
          border: 1px solid var(--turma-border, #2f363d);
          border-radius: 12px;
          background: var(--turma-card, #141619);
          padding: 10px 12px;
          color: var(--turma-muted, #98a0a8);
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
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
}
