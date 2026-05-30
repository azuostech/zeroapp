'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ContentAdminCard from '@/components/admin/ContentAdminCard';
import { useAdminContent } from '@/hooks/useAdminContent';

const TYPE_FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'video', label: 'Vídeos' },
  { id: 'tool', label: 'Ferramentas' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'article', label: 'Artigos' }
];

const TIER_FILTERS = [
  { id: '', label: 'Todos os níveis' },
  { id: 'LIVRE', label: 'Livre' },
  { id: 'MOVIMENTO', label: 'Mentorado' },
  { id: 'ACELERACAO', label: 'Aceleração' },
  { id: 'AUTOGOVERNO', label: 'Autogoverno' }
];

function isForbiddenError(message) {
  const value = String(message || '').toLowerCase();
  return value.includes('forbidden') || value.includes('acesso negado') || value.includes('403');
}

export default function AdminConteudoPage() {
  const router = useRouter();
  const { content, isLoading, filter, setFilter, togglePublish, deleteContent, updateContent, refresh, error } = useAdminContent();
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState('');

  const sortedContent = useMemo(
    () => [...content].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0)),
    [content]
  );

  const handleTogglePublish = async (item, nextValue) => {
    if (!item?.id) return;
    setBusyId(item.id);
    setFeedback('');
    try {
      await togglePublish(item.id, nextValue);
      setFeedback(nextValue ? 'Conteúdo publicado.' : 'Conteúdo movido para rascunho.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (item) => {
    if (!item?.id) return;
    setBusyId(item.id);
    setFeedback('');
    try {
      await deleteContent(item.id);
      setFeedback('Conteúdo removido.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao remover conteúdo.');
    } finally {
      setBusyId('');
    }
  };

  const handleUpdateOrder = async (item, nextOrder) => {
    if (!item?.id) return;
    setBusyId(item.id);
    setFeedback('');
    try {
      await updateContent(item.id, { order_index: nextOrder });
      setFeedback('Ordem atualizada.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao atualizar ordem.');
    } finally {
      setBusyId('');
    }
  };

  if (!isLoading && error && isForbiddenError(error)) {
    return (
      <div className="state-wrap">
        <div className="state-card">
          <h2>Acesso restrito</h2>
          <p>Esta área é exclusiva para administradores.</p>
          <Link href="/app">Voltar ao app</Link>
        </div>
        <style jsx>{`
          .state-wrap {
            min-height: 100vh;
            background: #0f1113;
            color: #f3f3f3;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .state-card {
            border: 1px solid #2f363d;
            background: #171c21;
            border-radius: 12px;
            padding: 18px;
            width: min(420px, 100%);
          }

          h2 {
            margin: 0 0 6px;
          }

          p {
            margin: 0 0 12px;
            color: #9aa8b3;
          }

          a {
            color: #42a5f5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-content-screen">
      <div className="shell">
        <header className="header">
          <div>
            <Link href="/admin" className="back-link">
              ← painel admin
            </Link>
            <h1>Gerenciar Conteúdo</h1>
            <p>Administra links externos, tiers e publicação de materiais da área de membros.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="btn ghost" onClick={() => refresh()}>
              Atualizar
            </button>
            <button type="button" className="btn solid" onClick={() => router.push('/admin/conteudo/novo')}>
              + Novo Conteúdo
            </button>
          </div>
        </header>

        <section className="filters">
          <div className="filter-group">
            {TYPE_FILTERS.map((item) => (
              <button
                key={item.id || 'all'}
                type="button"
                className={`pill ${filter.tipo === item.id ? 'active' : ''}`}
                onClick={() => setFilter({ tipo: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            {TIER_FILTERS.map((item) => (
              <button
                key={item.id || 'all-tier'}
                type="button"
                className={`pill ${filter.tier === item.id ? 'active tier' : ''}`}
                onClick={() => setFilter({ tier: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {feedback ? <div className="feedback">{feedback}</div> : null}
        {!isLoading && error && !isForbiddenError(error) ? <div className="feedback error">{error}</div> : null}

        <section className="list">
          {isLoading ? <div className="state-inline">Carregando conteúdos...</div> : null}

          {!isLoading && sortedContent.length === 0 ? (
            <div className="state-inline">Nenhum conteúdo encontrado com os filtros selecionados.</div>
          ) : null}

          {sortedContent.map((item) => (
            <ContentAdminCard
              key={`${item.id}-${item.order_index}-${item.is_published ? '1' : '0'}`}
              item={item}
              isBusy={busyId === item.id}
              onTogglePublish={handleTogglePublish}
              onEdit={(selected) => router.push(`/admin/conteudo/${selected.id}/editar`)}
              onDelete={handleDelete}
              onUpdateOrder={handleUpdateOrder}
            />
          ))}
        </section>
      </div>

      <style jsx>{`
        .admin-content-screen {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 0, var(--green-dim), transparent 42%), var(--bg-deep);
          color: var(--text);
          padding: 18px 14px 36px;
        }

        .shell {
          max-width: 1080px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .back-link {
          color: var(--text-2);
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        h1 {
          margin: 6px 0 4px;
          font-size: 30px;
          font-family: var(--font-display);
          font-weight: 700;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 13px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
          padding: 10px 12px;
          cursor: pointer;
        }

        .btn.solid {
          border-color: var(--green-mid);
          background: var(--green);
          color: #051208;
        }

        .filters {
          display: grid;
          gap: 8px;
          margin-bottom: 10px;
        }

        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pill {
          border: 1px solid var(--border-2);
          border-radius: 999px;
          background: var(--bg-surface);
          color: var(--text-2);
          font-size: 12px;
          font-weight: 700;
          padding: 7px 10px;
          cursor: pointer;
        }

        .pill.active {
          border-color: var(--green-mid);
          color: var(--green);
          background: var(--green-dim);
        }

        .pill.active.tier {
          border-color: rgba(255, 213, 79, 0.4);
          color: var(--gold);
          background: var(--gold-dim);
        }

        .feedback {
          border: 1px solid var(--green-mid);
          background: var(--green-dim);
          color: var(--green);
          border-radius: var(--radius-md);
          padding: 9px 10px;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .feedback.error {
          border-color: var(--red);
          background: var(--red-dim);
          color: var(--red);
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .state-inline {
          border: 1px solid var(--border-2);
          background: var(--bg-card);
          border-radius: var(--radius-md);
          padding: 12px;
          color: var(--text-2);
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .btn {
            flex: 1;
          }

          h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
}
