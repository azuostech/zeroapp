'use client';

import { useState } from 'react';

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} horas`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dias`;

  return date.toLocaleDateString('pt-BR');
}

function getInitial(name) {
  return String(name || 'M').trim().charAt(0).toUpperCase() || 'M';
}

function AuthorLine({ author, createdAt }) {
  return (
    <div className="author-line">
      <strong>{author?.name || 'Mentorado'}</strong>
      {author?.is_mentor ? <span className="mentor-badge">MENTOR</span> : null}
      <span>{formatRelativeTime(createdAt)}</span>

      <style jsx>{`
        .author-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }

        strong {
          font-size: 12px;
        }

        span {
          color: var(--text-2);
          font-size: 11px;
          font-weight: 700;
        }

        .mentor-badge {
          background: var(--green);
          color: var(--text-on-green);
          border-radius: 4px;
          padding: 2px 5px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}

export default function CommentItem({ comment, onReply, onDelete, onDeleteReply }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const submitReply = async () => {
    if (!replyBody.trim()) return;
    setIsSending(true);
    setError('');
    try {
      await onReply?.(comment.id, replyBody.trim());
      setReplyBody('');
      setReplyOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao responder');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <article className="comment-item">
      <div className="avatar" aria-hidden="true">
        {getInitial(comment?.author?.name)}
      </div>
      <div className="comment-main">
        <AuthorLine author={comment?.author} createdAt={comment?.created_at} />
        <p>{comment?.body}</p>

        <div className="comment-actions">
          <span>👍 {comment?.likes || 0}</span>
          <button type="button" onClick={() => setReplyOpen((current) => !current)}>
            ↩ Responder
          </button>
          {comment?.can_delete ? (
            <button type="button" className="danger" onClick={() => onDelete?.(comment.id)}>
              🗑 Deletar
            </button>
          ) : null}
        </div>

        {replyOpen ? (
          <div className="reply-form">
            <textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} rows={2} placeholder="Responder..." />
            <button type="button" disabled={isSending || !replyBody.trim()} onClick={submitReply}>
              Responder
            </button>
          </div>
        ) : null}

        {error ? <div className="reply-error">{error}</div> : null}

        {(comment?.replies || []).length > 0 ? (
          <div className="replies">
            {(comment.replies || []).map((reply) => (
              <div key={reply.id} className="reply">
                <div className="avatar small" aria-hidden="true">
                  {getInitial(reply?.author?.name)}
                </div>
                <div>
                  <AuthorLine author={reply?.author} createdAt={reply?.created_at} />
                  <p>{reply.body}</p>
                  {reply?.can_delete ? (
                    <button type="button" className="reply-delete" onClick={() => onDeleteReply?.(reply.id)}>
                      🗑 Deletar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .comment-item {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          padding: 10px;
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

        .avatar.small {
          width: 28px;
          height: 28px;
          font-size: 11px;
        }

        .comment-main {
          min-width: 0;
        }

        p {
          margin: 6px 0 0;
          color: var(--text2);
          font-size: 13px;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .comment-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
        }

        button {
          border: 0;
          background: transparent;
          color: var(--green);
          padding: 0;
          min-height: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        .danger,
        .reply-delete {
          color: var(--red);
        }

        .reply-form {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }

        textarea {
          width: 100%;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-sm);
          background: var(--bg);
          color: var(--text);
          padding: 9px;
          font-size: 13px;
          resize: vertical;
        }

        .reply-form button {
          justify-self: end;
          border: 1px solid var(--green-mid);
          border-radius: var(--radius-sm);
          background: var(--green-dim);
          color: var(--green-dark);
          padding: 7px 10px;
          min-height: 34px;
        }

        .reply-error {
          color: var(--red);
          font-size: 12px;
          margin-top: 6px;
        }

        .replies {
          display: grid;
          gap: 8px;
          margin-top: 10px;
          padding-left: 40px;
        }

        .reply {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 8px;
          border-left: 2px solid var(--green);
          background: var(--bg);
          border-radius: var(--radius-sm);
          padding: 8px;
        }

        .reply p {
          color: var(--text-2);
          font-size: 12px;
        }

        .reply-delete {
          margin-top: 5px;
          font-size: 11px;
        }
      `}</style>
    </article>
  );
}
