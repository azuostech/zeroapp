'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import CommentItem from '@/components/content/CommentItem';
import { useComments } from '@/hooks/useComments';

export default function CommentsSection({ aulaId }) {
  const { comments, total, isLoading, error, addComment, addReply, deleteComment, deleteReply } = useComments(aulaId);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const submitComment = async () => {
    if (!body.trim()) return;
    setIsSending(true);
    try {
      await addComment(body.trim());
      setBody('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao comentar');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      toast.success('Comentário removido');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover comentário');
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await deleteReply(replyId);
      toast.success('Resposta removida');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover resposta');
    }
  };

  return (
    <section className="comments-section">
      <header>
        <h2>Comentários</h2>
        <span>{total}</span>
      </header>

      <div className="comment-form">
        <div className="avatar" aria-hidden="true">
          M
        </div>
        <div>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Escreva um comentário..." />
          <button type="button" disabled={isSending || body.trim().length < 3} onClick={submitComment}>
            {isSending ? 'Comentando...' : 'Comentar'}
          </button>
        </div>
      </div>

      {isLoading ? <div className="state">Carregando comentários...</div> : null}
      {!isLoading && error ? <div className="state error">{error}</div> : null}
      {!isLoading && !error && comments.length === 0 ? <div className="state">Seja o primeiro a comentar!</div> : null}

      <div className="list">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={addReply}
            onDelete={handleDeleteComment}
            onDeleteReply={handleDeleteReply}
          />
        ))}
      </div>

      <style jsx>{`
        .comments-section {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          padding: 14px;
        }

        header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        h2 {
          margin: 0;
          font-size: 16px;
        }

        header span {
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          color: var(--green);
          font-weight: 900;
        }

        .comment-form {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--green);
          border: 1px solid var(--green);
          color: var(--text-on-green);
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 900;
        }

        textarea {
          width: 100%;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text);
          padding: 10px;
          resize: vertical;
          font-size: 13px;
        }

        .comment-form button {
          margin-top: 8px;
          border: 1px solid var(--green);
          border-radius: var(--radius-md);
          background: var(--green);
          color: var(--text-on-green);
          padding: 8px 11px;
          min-height: 38px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .comment-form button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .state {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          color: var(--text-2);
          padding: 10px 12px;
          font-size: 13px;
        }

        .state.error {
          border-color: color-mix(in srgb, var(--red) 28%, transparent);
          background: var(--red-dim);
          color: var(--red);
        }

        .list {
          display: grid;
          gap: 10px;
        }
      `}</style>
    </section>
  );
}
