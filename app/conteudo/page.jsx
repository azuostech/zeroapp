'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import ProgramCard from '@/components/content/ProgramCard';
import ContentEmpty from '@/components/content/ContentEmpty';
import { usePrograms } from '@/hooks/usePrograms';

function resolveTierLabel(tier) {
  const key = String(tier || '').toUpperCase();
  if (key === 'MOVIMENTO') return '🎓 Mentorado';
  if (key === 'ACELERACAO') return '⚡ Aceleração';
  if (key === 'AUTOGOVERNO') return '💎 Autogoverno';
  return '🌱 Livre';
}

export default function ConteudoPage() {
  const router = useRouter();
  const [isIAOpen, setIsIAOpen] = useState(false);
  const { programs, tierUsuario, isLoading, error, refresh } = usePrograms();

  return (
    <div className="conteudo-screen">
      <AppHeader />

      <main className="conteudo-shell">
        <header className="conteudo-header">
          <div>
            <Link href="/app" className="back-link">
              ← voltar
            </Link>
            <h1>Educação 📚</h1>
          </div>
          <div className="header-side">
            <span className="tier-pill">{resolveTierLabel(tierUsuario)}</span>
            <button type="button" className="refresh-btn" onClick={refresh}>
              Atualizar
            </button>
          </div>
        </header>

        <section className="program-list" aria-live="polite">
          {isLoading ? <div className="loading-inline">Carregando programas...</div> : null}
          {!isLoading && error ? <div className="error-inline">{error}</div> : null}
          {!isLoading && !error && programs.length === 0 ? <ContentEmpty /> : null}

          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} onClick={(selected) => router.push(`/conteudo/${selected.id}`)} />
          ))}
        </section>
      </main>

      <BottomNav activeTab="inicio" />
      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />

      <style jsx>{`
        .conteudo-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }

        .conteudo-shell {
          min-height: 100vh;
          max-width: 920px;
          margin: 0 auto;
          padding: 20px 14px calc(120px + env(safe-area-inset-bottom));
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
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 800;
        }

        h1 {
          margin: 4px 0 0;
          font-size: 22px;
          font-weight: 900;
          line-height: 1.1;
          color: var(--text);
        }

        .header-side {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .tier-pill,
        .refresh-btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          color: var(--text);
          min-height: 38px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .tier-pill {
          color: var(--green);
          border-color: var(--green-mid);
          background: var(--green-dim);
        }

        .refresh-btn {
          cursor: pointer;
        }

        .program-list {
          display: grid;
          gap: 12px;
        }

        .loading-inline,
        .error-inline {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          padding: 10px 12px;
          color: var(--text-2);
          font-size: 13px;
        }

        .error-inline {
          border-color: color-mix(in srgb, var(--red) 28%, transparent);
          background: var(--red-dim);
          color: var(--red);
        }

        @media (max-width: 760px) {
          .conteudo-shell {
            padding: 14px 10px calc(106px + env(safe-area-inset-bottom));
          }

          .conteudo-header {
            flex-direction: column;
          }

          .header-side {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
