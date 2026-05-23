'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import ContentCard from '@/components/content/ContentCard';
import ContentFilterTabs from '@/components/content/ContentFilterTabs';
import ContentEmpty from '@/components/content/ContentEmpty';
import { useContent } from '@/hooks/useContent';

export default function ConteudoPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const queryType = activeFilter === 'all' ? null : activeFilter;
  const { content, bloqueado, tierUsuario, isLoading, refetch } = useContent(queryType);

  const handleContentClick = useCallback((item, locked) => {
    if (locked) return;

    const url = String(item?.url || '').trim();
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const cards = useMemo(() => {
    const unlocked = (content || []).map((item) => ({ item, locked: false }));
    const locked = (bloqueado || []).map((item) => ({ item, locked: true }));

    return [...unlocked, ...locked].sort((a, b) => Number(a.item?.order_index || 0) - Number(b.item?.order_index || 0));
  }, [content, bloqueado]);

  return (
    <div className="conteudo-screen">
      <AppHeader />

      <main className="conteudo-shell">
        <header className="conteudo-header">
          <div>
            <Link href="/app" className="back-link">
              ← voltar
            </Link>
            <h1>Conteudo 📚</h1>
            <p>Tier atual: {tierUsuario}</p>
          </div>
          <button type="button" className="refresh-btn" onClick={refetch}>
            Atualizar
          </button>
        </header>

        <section className="filter-wrap">
          <ContentFilterTabs active={activeFilter} onChange={setActiveFilter} />
        </section>

        <section className="content-list" aria-live="polite">
          {isLoading ? <div className="loading-inline">Carregando conteudos...</div> : null}
          {!isLoading && cards.length === 0 ? <ContentEmpty /> : null}

          {cards.map(({ item, locked }) => (
            <ContentCard key={`${item.id}-${locked ? 'locked' : 'open'}`} item={item} locked={locked} onClick={() => handleContentClick(item, locked)} />
          ))}
        </section>
      </main>

      <BottomNav activeTab="inicio" />

      <style jsx>{`
        :global(html[data-theme='dark']) {
          --conteudo-bg: #0b0d0f;
          --conteudo-text: #f3f3f3;
          --conteudo-muted: #8e98a2;
          --conteudo-card: #141619;
          --conteudo-border: #2f363d;
          --conteudo-positive: #00c853;
        }

        :global(html[data-theme='light']) {
          --conteudo-bg: #f3f6f8;
          --conteudo-text: #182129;
          --conteudo-muted: #62707c;
          --conteudo-card: #ffffff;
          --conteudo-border: #d3dde6;
          --conteudo-positive: #0b8a46;
        }

        .conteudo-screen {
          min-height: 100vh;
          background: var(--conteudo-bg, #0b0d0f);
          color: var(--conteudo-text, #f3f3f3);
        }

        .conteudo-shell {
          max-width: 920px;
          margin: 0 auto;
          padding: 20px 14px calc(98px + env(safe-area-inset-bottom));
        }

        .conteudo-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .back-link {
          color: var(--conteudo-muted, #8e98a2);
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
          color: var(--conteudo-muted, #8e98a2);
          font-size: 14px;
        }

        .refresh-btn {
          border: 1px solid var(--conteudo-border, #2f363d);
          border-radius: 11px;
          background: var(--conteudo-card, #141619);
          color: var(--conteudo-text, #f3f3f3);
          font-size: 13px;
          font-weight: 700;
          padding: 9px 13px;
          cursor: pointer;
        }

        .filter-wrap {
          margin-bottom: 12px;
        }

        .content-list {
          display: grid;
          gap: 10px;
        }

        .loading-inline {
          border: 1px solid var(--conteudo-border, #2f363d);
          border-radius: 12px;
          background: var(--conteudo-card, #141619);
          padding: 10px 12px;
          color: var(--conteudo-muted, #8e98a2);
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .conteudo-shell {
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
