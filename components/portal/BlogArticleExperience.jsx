'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CommentsSection from '@/components/content/CommentsSection';
import styles from './portal.module.css';

export default function BlogArticleExperience({ article, programId, previousArticle, nextArticle, isLoggedIn }) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(isLoggedIn);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !article?.id) return;

    const loadProgress = async () => {
      try {
        await fetch(`/api/content/${article.id}/progress`, { method: 'POST' });
        const response = await fetch(`/api/content/${article.id}/progress`);
        if (!response.ok) return;
        const payload = await response.json();
        setIsCompleted(Boolean(payload?.progress?.completed_at));
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [article?.id, isLoggedIn]);

  const updateCompletion = async (completed) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/content/${article.id}/progress/complete`, {
        method: completed ? 'POST' : 'DELETE'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Não foi possível atualizar a leitura'));

      setIsCompleted(completed);
      if (completed && payload?.coins_awarded > 0) {
        toast.success(`+${payload.coins_awarded} 🪙 Artigo marcado como lido!`);
        window.dispatchEvent(new CustomEvent('zero:coins-updated'));
      } else {
        toast.success(completed ? 'Artigo marcado como lido!' : 'Artigo marcado como não lido');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a leitura');
    } finally {
      setIsUpdating(false);
    }
  };

  const articleHref = (target) => target
    ? `/portal/${programId}/artigos/${target.id}`
    : null;

  return (
    <>
      <section className={styles.articleEngagementCard}>
        <h2>{article.title}</h2>
        {article.description ? <p>{article.description}</p> : null}

        <div className={styles.articleNavigation}>
          {previousArticle ? (
            <Link href={articleHref(previousArticle)} className={styles.articleNavigationButton}>‹ Anterior</Link>
          ) : (
            <span className={`${styles.articleNavigationButton} ${styles.articleNavigationDisabled}`}>‹ Anterior</span>
          )}
          {nextArticle ? (
            <Link href={articleHref(nextArticle)} className={styles.articleNavigationButton}>Próxima ›</Link>
          ) : (
            <span className={`${styles.articleNavigationButton} ${styles.articleNavigationDisabled}`}>Próxima ›</span>
          )}
        </div>

        {isLoggedIn ? (
          <div className={styles.articleStatusRow}>
            <span className={`${styles.articleStatusPill} ${isCompleted ? styles.articleStatusDone : ''}`}>
              {isLoadingProgress ? 'Carregando...' : isCompleted ? '✓ Lida' : '○ Não lida'}
            </span>
            <button
              type="button"
              className={isCompleted ? styles.articleUncompleteButton : styles.articleCompleteButton}
              disabled={isLoadingProgress || isUpdating}
              onClick={() => updateCompletion(!isCompleted)}
            >
              {isUpdating ? 'Atualizando...' : isCompleted ? 'Marcar como não lida' : 'Marcar como lida ✓'}
            </button>
          </div>
        ) : (
          <div className={styles.articleGuestNotice}>
            <span>Entre no ZeroApp para marcar como lida e participar dos comentários.</span>
            <Link href={`/?tab=login&next=${encodeURIComponent(`/portal/${programId}/artigos/${article.id}`)}`}>
              Entrar
            </Link>
          </div>
        )}
      </section>

      {isLoggedIn ? (
        <div className={styles.portalComments}>
          <CommentsSection aulaId={article.id} />
        </div>
      ) : null}
    </>
  );
}
