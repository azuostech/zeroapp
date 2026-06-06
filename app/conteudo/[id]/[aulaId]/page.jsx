'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import BottomNav from '@/components/layout/BottomNav';
import CommentsSection from '@/components/content/CommentsSection';
import { ContentEmbed } from '@/components/ui/ContentEmbed';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';
import { useProgramDetail } from '@/hooks/useProgramDetail';

function flattenAulas(sessions) {
  return (sessions || []).flatMap((session) => (session?.aulas || []).map((aula) => ({ ...aula, session_id: session.id })));
}

export default function AulaPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const programId = String(params?.id || '').trim();
  const aulaId = String(params?.aulaId || '').trim();
  const { program, sessions, isLoading, error, refresh } = useProgramDetail(programId);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const aulas = useMemo(() => flattenAulas(sessions).filter((aula) => !aula.locked), [sessions]);
  const currentIndex = aulas.findIndex((aula) => aula.id === aulaId);
  const aula = currentIndex >= 0 ? aulas[currentIndex] : null;
  const previous = currentIndex > 0 ? aulas[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < aulas.length - 1 ? aulas[currentIndex + 1] : null;

  useEffect(() => {
    if (!aulaId || !aula) return;
    fetch(`/api/content/${aulaId}/progress`, { method: 'POST' }).catch(() => {});
  }, [aula, aulaId]);

  useEffect(() => {
    setIsCompleted(Boolean(aula?.progress?.completed_at));
  }, [aula?.progress?.completed_at]);

  const completeLesson = async () => {
    if (!aulaId) return;
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/content/${aulaId}/progress/complete`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Erro ao concluir aula'));
      setIsCompleted(true);
      if (payload?.coins_awarded > 0) {
        toast.success(`+${payload.coins_awarded} 🪙 Aula concluída!`);
        window.dispatchEvent(new CustomEvent('zero:coins-updated'));
      } else {
        toast.success('Aula concluída!');
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao concluir aula');
    } finally {
      setIsCompleting(false);
    }
  };

  const uncompleteLesson = async () => {
    if (!aulaId) return;
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/content/${aulaId}/progress/complete`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Erro ao desmarcar aula'));
      setIsCompleted(false);
      toast.success('Aula desmarcada');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desmarcar aula');
    } finally {
      setIsCompleting(false);
    }
  };

  const goToAula = (target) => {
    if (!target?.id) return;
    router.push(`/conteudo/${programId}/${target.id}`);
  };

  return (
    <div className="aula-screen">
      <header className="player-header">
        <Link href={`/conteudo/${programId}`} className="back-btn">
          ←
        </Link>
        <span>{aula?.title || program?.title || 'Aula'}</span>
      </header>

      <main className="player-main">
        {isLoading ? <div className="state-inline">Carregando aula...</div> : null}
        {!isLoading && error ? <div className="error-inline">{error}</div> : null}
        {!isLoading && !error && !aula ? <div className="error-inline">Aula indisponível.</div> : null}

        {aula ? (
          <>
            <div className="player-wrapper">
              <ContentEmbed
                url={aula.url}
                contentType={aula.content_type}
                title={aula.title}
                poster={resolveImageUrlForDisplay(aula.thumbnail_url) || null}
              />
            </div>

            <section className="info-card">
              <h1>{aula.title}</h1>
              {aula.description ? <p>{aula.description}</p> : null}

              <div className="nav-row">
                <button type="button" className="nav-btn" disabled={!previous} onClick={() => goToAula(previous)}>
                  ‹ Anterior
                </button>
                <button type="button" className="nav-btn" disabled={!next} onClick={() => goToAula(next)}>
                  Próxima ›
                </button>
              </div>

              <div className="status-row">
                <span className={`status-pill ${isCompleted ? 'done' : ''}`}>
                  {isCompleted ? '✓ Concluída' : '○ Não concluída'}
                </span>
                {!isCompleted ? (
                  <button type="button" className="complete-btn" disabled={isCompleting} onClick={completeLesson}>
                    {isCompleting ? 'Marcando...' : 'Marcar como concluída ✓'}
                  </button>
                ) : (
                  <button type="button" className="uncomplete-btn" disabled={isCompleting} onClick={uncompleteLesson}>
                    {isCompleting ? 'Desmarcando...' : 'Desmarcar'}
                  </button>
                )}
              </div>
            </section>

            <CommentsSection aulaId={aulaId} />
          </>
        ) : null}
      </main>

      <BottomNav activeTab="inicio" />

      <style jsx>{`
        .aula-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding-bottom: calc(116px + env(safe-area-inset-bottom));
        }

        .player-header {
          position: sticky;
          top: 0;
          z-index: 2;
          height: 58px;
          border-bottom: 1px solid var(--border-2);
          background: color-mix(in srgb, var(--bg) 92%, transparent);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
        }

        .back-btn {
          width: 42px;
          height: 42px;
          border: 1px solid var(--border-2);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--bg2);
          font-size: 18px;
          font-weight: 900;
          flex: 0 0 auto;
        }

        .player-header span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 900;
        }

        .player-main {
          max-width: 960px;
          margin: 0 auto;
          padding: 14px;
          display: grid;
          gap: 12px;
        }

        .player-wrapper,
        .info-card,
        .state-inline,
        .error-inline {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg2);
        }

        .player-wrapper {
          overflow: hidden;
        }

        .info-card {
          padding: 14px;
        }

        h1,
        h2 {
          margin: 0;
        }

        h1 {
          font-size: 22px;
          line-height: 1.16;
        }

        h2 {
          font-size: 16px;
        }

        p {
          margin: 8px 0 0;
          color: var(--text-2);
          font-size: 13px;
          line-height: 1.45;
        }

        .nav-row,
        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .nav-row {
          justify-content: space-between;
        }

        .nav-btn,
        .complete-btn,
        .uncomplete-btn,
        .status-pill {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          min-height: 40px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 900;
        }

        .nav-btn,
        .complete-btn,
        .uncomplete-btn {
          cursor: pointer;
        }

        .nav-btn:disabled,
        .complete-btn:disabled,
        .uncomplete-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .status-pill.done {
          border-color: var(--green-mid);
          background: var(--green-dim);
          color: var(--green);
        }

        .complete-btn {
          background: var(--green);
          border-color: var(--green);
          color: #03150a;
        }

        .uncomplete-btn {
          background: var(--bg-surface);
          border-color: var(--border-2);
          color: var(--text-2);
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
