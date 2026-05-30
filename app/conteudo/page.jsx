'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import ContentCard from '@/components/content/ContentCard';
import ContentFilterTabs from '@/components/content/ContentFilterTabs';
import ContentEmpty from '@/components/content/ContentEmpty';
import { useContent } from '@/hooks/useContent';

export default function ConteudoPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const queryType = activeFilter === 'all' ? null : activeFilter;
  const { content, bloqueado, tierUsuario, isLoading, error, warning, refetch } = useContent(queryType);

  const unlockedCards = useMemo(() => {
    return [...(content || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
  }, [content]);

  const lockedCards = useMemo(() => {
    return [...(bloqueado || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
  }, [bloqueado]);

  return (
    <div className="conteudo-screen">
      <AppHeader />

      <main className="conteudo-shell">
        <header className="conteudo-header">
          <div>
            <Link href="/app" className="back-link">
              ← voltar
            </Link>
            <h1 className="text-display">Conteúdo 📚</h1>
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
          {!isLoading && error ? <div className="error-inline">{error}</div> : null}
          {!isLoading && !error && warning ? <div className="warning-inline">Alguns conteúdos bloqueados não puderam ser carregados agora.</div> : null}
          {!isLoading && unlockedCards.length === 0 && lockedCards.length === 0 ? <ContentEmpty /> : null}

          {unlockedCards.map((item) => (
            <ContentCard key={`${item.id}-open`} item={item} locked={false} />
          ))}

          {lockedCards.length > 0 ? <div className="locked-separator">🔒 Em breve</div> : null}

          {lockedCards.map((item) => (
            <ContentCard key={`${item.id}-locked`} item={item} locked />
          ))}
        </section>
      </main>

      <BottomNav activeTab="inicio" />

      <style jsx>{`
        .conteudo-screen {
          min-height: 100vh;
          background: var(--bg-deep);
          color: var(--text);
        }

        .conteudo-shell {
          max-width: 920px;
          margin: 0 auto;
          padding: 20px 14px calc(114px + env(safe-area-inset-bottom));
        }

        .conteudo-header {
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
          font-size: 28px;
          line-height: 1.1;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 14px;
        }

        .refresh-btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
          padding: 9px 13px;
          cursor: pointer;
          transition: var(--transition);
        }

        .filter-wrap {
          margin-bottom: 12px;
        }

        .content-list {
          display: grid;
          gap: 10px;
        }

        .loading-inline {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          padding: 10px 12px;
          color: var(--text-2);
          font-size: 13px;
        }

        .error-inline {
          border: 1px solid rgba(255, 90, 90, 0.28);
          border-radius: 12px;
          background: rgba(255, 90, 90, 0.08);
          padding: 10px 12px;
          color: #ff7f7f;
          font-size: 13px;
        }

        .warning-inline {
          border: 1px solid rgba(255, 215, 0, 0.32);
          border-radius: var(--radius-md);
          background: var(--gold-dim);
          padding: 10px 12px;
          color: var(--gold);
          font-size: 13px;
        }

        .locked-separator {
          font-size: 11px;
          color: var(--text-3);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          padding: 8px 2px 2px;
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
