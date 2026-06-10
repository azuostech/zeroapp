'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';
import { useAdminContent } from '@/hooks/useAdminContent';
import { useAdminPrograms } from '@/hooks/useAdminPrograms';

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

const TYPE_META = {
  video: { label: 'Vídeo', icon: '🎬' },
  pdf: { label: 'PDF', icon: '📄' },
  article: { label: 'Artigo', icon: '📝' },
  tool: { label: 'Ferramenta', icon: '🔧' }
};

const TIER_LABELS = {
  LIVRE: 'Livre',
  MOVIMENTO: 'Mentorado',
  ACELERACAO: 'Aceleração',
  AUTOGOVERNO: 'Autogoverno'
};

const VISIBILITY_LABELS = {
  visible: '● Visível',
  locked: '🔒 Bloqueado',
  hidden: '👁 Oculto'
};

function isForbiddenError(message) {
  const value = String(message || '').toLowerCase();
  return value.includes('forbidden') || value.includes('acesso negado') || value.includes('403');
}

function sortByOrder(items) {
  return [...(items || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
}

function getTypeMeta(contentType) {
  return TYPE_META[String(contentType || '').toLowerCase()] || { label: 'Conteúdo', icon: '📚' };
}

function getTierBadgeClass(tier) {
  const key = String(tier || '').toUpperCase();
  if (key === 'MOVIMENTO') return 'badge-gold';
  if (key === 'ACELERACAO') return 'badge-blue';
  if (key === 'AUTOGOVERNO') return 'badge-purple';
  return 'badge-green';
}

function truncateUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'Sem URL';
  return value.length > 52 ? `${value.slice(0, 49)}...` : value;
}

function mapContentBySession(content) {
  const bySession = new Map();
  const loose = [];

  for (const item of sortByOrder(content || [])) {
    const sessionId = String(item?.session_id || '').trim();
    if (!sessionId) {
      loose.push(item);
      continue;
    }

    const current = bySession.get(sessionId) || [];
    current.push(item);
    bySession.set(sessionId, current);
  }

  return { bySession, loose };
}

function ContentAulaRow({ item, busyId, onEdit, onTogglePublish, onDelete, onUpdateOrder }) {
  const type = getTypeMeta(item?.content_type);
  const tier = String(item?.tier_required || 'LIVRE').toUpperCase();
  const visibility = String(item?.visibility || 'visible').toLowerCase();
  const thumbnailUrl = resolveImageUrlForDisplay(item?.thumbnail_url);
  const isBusy = busyId === `content:${item?.id}`;

  return (
    <article className={`aula-row ${item?.is_published ? '' : 'draft'} ${visibility === 'hidden' ? 'hidden-item' : ''}`}>
      <div className="aula-thumb" aria-hidden="true">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="" loading="lazy" /> : <span>{type.icon}</span>}
      </div>

      <div className="aula-main">
        <div className="aula-title-row">
          <h4>{item?.title || 'Sem título'}</h4>
          <span className="badge badge-neutral">
            {type.icon} {type.label}
          </span>
          <span className={`badge ${getTierBadgeClass(tier)}`}>{TIER_LABELS[tier] || tier}</span>
          <span className="badge badge-neutral">{VISIBILITY_LABELS[visibility] || visibility}</span>
          {!item?.is_published ? <span className="badge draft-badge">Rascunho</span> : null}
        </div>

        <p>{item?.description || 'Sem descrição.'}</p>

        <div className="aula-meta">
          {item?.turma_exclusiva ? <span>Turma {item.turma_exclusiva}</span> : <span>Todas as turmas</span>}
          {item?.disponivel_em ? <span>Liberação {item.disponivel_em}</span> : null}
          <a href={item?.url || '#'} target="_blank" rel="noreferrer" className={item?.url ? '' : 'disabled'}>
            {truncateUrl(item?.url)}
          </a>
        </div>
      </div>

      <div className="aula-actions">
        <label className="order-field">
          Ordem
          <input
            type="number"
            defaultValue={Number(item?.order_index || 0)}
            disabled={isBusy}
            onBlur={(event) => {
              const nextOrder = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(nextOrder) && nextOrder !== Number(item?.order_index || 0)) {
                onUpdateOrder?.(item, nextOrder);
              }
            }}
          />
        </label>
        <button type="button" className="btn small" disabled={isBusy} onClick={() => onEdit?.(item)}>
          Editar
        </button>
        <button type="button" className="btn small" disabled={isBusy} onClick={() => onTogglePublish?.(item)}>
          {item?.is_published ? 'Despublicar' : 'Publicar'}
        </button>
        <button type="button" className="btn small danger" disabled={isBusy} onClick={() => onDelete?.(item)}>
          Excluir
        </button>
      </div>
    </article>
  );
}

export default function AdminConteudoPage() {
  const router = useRouter();
  const {
    content,
    isLoading: contentLoading,
    filter,
    setFilter,
    togglePublish,
    deleteContent,
    updateContent,
    refresh: refreshContent,
    error: contentError
  } = useAdminContent();
  const {
    programs,
    isLoading: programsLoading,
    error: programsError,
    refresh: refreshPrograms,
    updateProgram,
    deleteProgram,
    createSession,
    updateSession,
    deleteSession
  } = useAdminPrograms();
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState('');

  const sortedPrograms = useMemo(() => sortByOrder(programs), [programs]);
  const { bySession: contentBySession, loose: looseContent } = useMemo(() => mapContentBySession(content), [content]);
  const isLoading = contentLoading || programsLoading;
  const error = contentError || programsError;
  const hasActiveFilter = Boolean(filter.tipo || filter.tier);

  const refreshAll = async () => {
    await Promise.all([refreshContent(), refreshPrograms()]);
  };

  const toggleExpanded = (id) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  const runAction = async (id, action, successMessage) => {
    setBusyId(id);
    setFeedback('');
    try {
      await action();
      setFeedback(successMessage);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Erro ao executar ação.');
    } finally {
      setBusyId('');
    }
  };

  const handleTogglePublish = async (item) => {
    if (!item?.id) return;
    await runAction(
      `content:${item.id}`,
      () => togglePublish(item.id, !Boolean(item.is_published)),
      item.is_published ? 'Aula movida para rascunho.' : 'Aula publicada.'
    );
  };

  const handleDeleteContent = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Remover a aula "${item?.title || 'sem título'}"?`);
    if (!ok) return;

    await runAction(
      `content:${item.id}`,
      async () => {
        await deleteContent(item.id);
        await refreshPrograms();
      },
      'Aula removida.'
    );
  };

  const handleUpdateOrder = async (item, nextOrder) => {
    if (!item?.id) return;
    await runAction(`content:${item.id}`, () => updateContent(item.id, { order_index: nextOrder }), 'Ordem da aula atualizada.');
  };

  const handleCreateSession = async (program) => {
    const title = window.prompt('Nome da sessão');
    if (!title || !title.trim()) return;

    const sessions = sortByOrder(program?.content_sessions || []);
    const orderIndex = sessions.reduce((max, session) => Math.max(max, Number(session?.order_index || 0)), 0) + 1;

    await runAction(
      `program:${program.id}`,
      () =>
        createSession(program.id, {
          title: title.trim(),
          visibility: 'visible',
          order_index: orderIndex
        }),
      'Sessão criada.'
    );
    setExpanded((current) => ({ ...current, [program.id]: true }));
  };

  const handleEditProgram = async (program) => {
    const title = window.prompt('Novo nome do programa', program?.title || '');
    if (!title || !title.trim() || title.trim() === program?.title) return;
    await runAction(`program:${program.id}`, () => updateProgram(program.id, { title: title.trim() }), 'Programa atualizado.');
  };

  const handleDeleteProgram = async (program) => {
    const ok = window.confirm(`Remover o programa "${program?.title || 'sem título'}"? As sessões serão removidas.`);
    if (!ok) return;
    await runAction(`program:${program.id}`, () => deleteProgram(program.id), 'Programa removido.');
  };

  const handleEditSession = async (session) => {
    const title = window.prompt('Novo nome da sessão', session?.title || '');
    if (!title || !title.trim() || title.trim() === session?.title) return;
    await runAction(`session:${session.id}`, () => updateSession(session.id, { title: title.trim() }), 'Sessão atualizada.');
  };

  const handleDeleteSession = async (session) => {
    const ok = window.confirm(`Remover a sessão "${session?.title || 'sem título'}"? As aulas ficam sem sessão.`);
    if (!ok) return;
    await runAction(
      `session:${session.id}`,
      async () => {
        await deleteSession(session.id);
        await refreshContent();
      },
      'Sessão removida.'
    );
  };

  const routeToNewContent = (sessionId = '') => {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    router.push(`/admin/conteudo/novo${query}`);
  };

  const routeToEditContent = (item) => {
    if (item?.id) router.push(`/admin/conteudo/${item.id}/editar`);
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
            background: var(--bg-deep);
            color: var(--text);
            display: grid;
            place-items: center;
            padding: 20px;
          }

          .state-card {
            border: 1px solid var(--border-2);
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            padding: 18px;
            width: min(420px, 100%);
          }

          p {
            color: var(--text-2);
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
            <h1>Conteúdo por Programas</h1>
            <p>Organize a área de membros como o aluno vê: programas, sessões e aulas.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="btn ghost" onClick={refreshAll}>
              Atualizar
            </button>
            <button type="button" className="btn ghost" onClick={() => router.push('/admin/conteudo/programas/novo')}>
              + Programa
            </button>
            <button type="button" className="btn solid" onClick={() => routeToNewContent()}>
              + Aula avulsa
            </button>
          </div>
        </header>

        <section className="filters" aria-label="Filtros de conteúdo">
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

        <section className="program-list">
          {isLoading ? <div className="state-inline">Carregando estrutura de conteúdo...</div> : null}

          {!isLoading && sortedPrograms.length === 0 ? (
            <div className="state-inline">Nenhum programa cadastrado. Crie um programa para organizar as aulas.</div>
          ) : null}

          {sortedPrograms.map((program) => {
            const sessions = sortByOrder(program?.content_sessions || []);
            const isOpen = Boolean(expanded[program.id]);
            const thumb = resolveImageUrlForDisplay(program?.thumbnail_url);
            const filteredAulasCount = sessions.reduce(
              (total, session) => total + (contentBySession.get(session.id)?.length || 0),
              0
            );
            const totalAulas = Number(program?.aulas_count || 0);
            const countLabel = hasActiveFilter ? `${filteredAulasCount} de ${totalAulas} aulas nos filtros` : `${totalAulas} aulas`;

            return (
              <article key={program.id} className={`program-card ${program?.is_published ? '' : 'draft'}`}>
                <div className="program-row">
                  <div className="program-cover" aria-hidden="true">
                    {thumb ? <img src={thumb} alt="" /> : <span>📚</span>}
                  </div>

                  <div className="program-main">
                    <div className="title-row">
                      <h2>{program?.title || 'Sem título'}</h2>
                      <span className={`badge ${getTierBadgeClass(program?.tier_required)}`}>
                        {TIER_LABELS[program?.tier_required] || program?.tier_required || 'Livre'}
                      </span>
                      <span className="badge badge-neutral">{VISIBILITY_LABELS[program?.visibility] || program?.visibility}</span>
                      {!program?.is_published ? <span className="badge draft-badge">Rascunho</span> : null}
                    </div>

                    <p>{program?.description || 'Programa sem descrição.'}</p>

                    <div className="program-meta">
                      <span>{sessions.length} sessões</span>
                      <span>{countLabel}</span>
                      <span>Turma: {program?.turma_exclusiva || 'todas'}</span>
                    </div>
                  </div>

                  <div className="program-actions">
                    <button type="button" className="btn small" disabled={busyId === `program:${program.id}`} onClick={() => toggleExpanded(program.id)}>
                      {isOpen ? 'Ocultar' : 'Ver sessões'}
                    </button>
                    <button type="button" className="btn small" disabled={busyId === `program:${program.id}`} onClick={() => handleCreateSession(program)}>
                      + Sessão
                    </button>
                    <button type="button" className="btn small" disabled={busyId === `program:${program.id}`} onClick={() => handleEditProgram(program)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn small"
                      disabled={busyId === `program:${program.id}`}
                      onClick={() =>
                        runAction(
                          `program:${program.id}`,
                          () => updateProgram(program.id, { is_published: !program.is_published }),
                          program.is_published ? 'Programa movido para rascunho.' : 'Programa publicado.'
                        )
                      }
                    >
                      {program.is_published ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button type="button" className="btn small danger" disabled={busyId === `program:${program.id}`} onClick={() => handleDeleteProgram(program)}>
                      Excluir
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="sessions">
                    {sessions.length === 0 ? <div className="empty-session">Nenhuma sessão criada neste programa.</div> : null}

                    {sessions.map((session) => {
                      const aulas = contentBySession.get(session.id) || [];
                      return (
                        <section key={session.id} className="session-card">
                          <div className="session-head">
                            <div>
                              <h3>{session?.title || 'Sessão sem título'}</h3>
                              <p>
                                {VISIBILITY_LABELS[session?.visibility] || session?.visibility} · {aulas.length}
                                {hasActiveFilter ? ' aulas nos filtros' : ' aulas'}
                              </p>
                            </div>

                            <div className="session-actions">
                              <button type="button" className="btn small" disabled={busyId === `session:${session.id}`} onClick={() => routeToNewContent(session.id)}>
                                + Aula
                              </button>
                              <button type="button" className="btn small" disabled={busyId === `session:${session.id}`} onClick={() => handleEditSession(session)}>
                                Editar sessão
                              </button>
                              <button type="button" className="btn small danger" disabled={busyId === `session:${session.id}`} onClick={() => handleDeleteSession(session)}>
                                Excluir sessão
                              </button>
                            </div>
                          </div>

                          <div className="aula-list">
                            {aulas.length === 0 ? (
                              <div className="empty-session">
                                {hasActiveFilter ? 'Nenhuma aula nesta sessão com os filtros atuais.' : 'Nenhuma aula cadastrada nesta sessão.'}
                              </div>
                            ) : null}

                            {aulas.map((item) => (
                              <ContentAulaRow
                                key={item.id}
                                item={item}
                                busyId={busyId}
                                onEdit={routeToEditContent}
                                onTogglePublish={handleTogglePublish}
                                onDelete={handleDeleteContent}
                                onUpdateOrder={handleUpdateOrder}
                              />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {!isLoading && looseContent.length > 0 ? (
          <section className="loose-section">
            <div className="loose-head">
              <div>
                <h2>Aulas sem programa</h2>
                <p>Conteúdos sem sessão ainda não aparecem dentro da experiência principal por programas.</p>
              </div>
              <button type="button" className="btn solid" onClick={() => routeToNewContent()}>
                + Aula avulsa
              </button>
            </div>

            <div className="aula-list">
              {looseContent.map((item) => (
                <ContentAulaRow
                  key={item.id}
                  item={item}
                  busyId={busyId}
                  onEdit={routeToEditContent}
                  onTogglePublish={handleTogglePublish}
                  onDelete={handleDeleteContent}
                  onUpdateOrder={handleUpdateOrder}
                />
              ))}
            </div>
          </section>
        ) : null}

        <footer className="legend">
          <span>● Visível = aluno acessa normalmente</span>
          <span>🔒 Bloqueado = aluno vê o card sem acessar</span>
          <span>👁 Oculto = não aparece para o aluno</span>
        </footer>
      </div>

      <style jsx>{`
        .admin-content-screen {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 0, var(--green-dim), transparent 42%), var(--bg-deep);
          color: var(--text);
          padding: 18px 14px 36px;
        }

        .shell {
          max-width: 1180px;
          margin: 0 auto;
        }

        .header,
        .program-row,
        .title-row,
        .program-meta,
        .program-actions,
        .session-head,
        .session-actions,
        .aula-title-row,
        .aula-meta,
        .aula-actions,
        .loose-head,
        .legend {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header,
        .loose-head {
          justify-content: space-between;
          align-items: flex-start;
        }

        .header {
          margin-bottom: 14px;
        }

        .back-link {
          color: var(--text-2);
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        h1,
        h2,
        h3,
        h4,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 6px;
          font-size: 30px;
          font-family: var(--font-display);
          line-height: 1.15;
        }

        h2 {
          font-size: 20px;
          font-family: var(--font-display);
        }

        h3 {
          font-size: 15px;
        }

        h4 {
          font-size: 14px;
          line-height: 1.25;
        }

        p {
          color: var(--text-2);
          font-size: 13px;
          line-height: 1.4;
        }

        .header-actions,
        .program-actions,
        .session-actions,
        .aula-actions,
        .legend,
        .aula-title-row,
        .aula-meta {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 12px;
          font-weight: 800;
          padding: 8px 10px;
          cursor: pointer;
          transition: var(--transition);
        }

        .btn:hover {
          border-color: var(--green-mid);
          color: var(--green);
        }

        .btn.solid {
          background: var(--green);
          border-color: var(--green);
          color: #03150a;
        }

        .btn.small {
          min-height: 36px;
          padding: 6px 9px;
        }

        .btn.danger {
          color: var(--red);
        }

        .btn.danger:hover {
          border-color: var(--red);
        }

        .filters {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pill {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-full);
          background: var(--bg-surface);
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
          padding: 7px 10px;
          cursor: pointer;
        }

        .pill.active {
          border-color: var(--green-mid);
          color: var(--green);
          background: var(--green-dim);
        }

        .pill.active.tier {
          border-color: rgba(255, 215, 0, 0.35);
          color: var(--gold);
          background: var(--gold-dim);
        }

        .feedback,
        .state-inline {
          border: 1px solid var(--green-mid);
          border-radius: var(--radius-md);
          background: var(--green-dim);
          color: var(--green);
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .feedback.error {
          border-color: color-mix(in srgb, var(--red) 30%, transparent);
          background: var(--red-dim);
          color: var(--red);
        }

        .program-list {
          display: grid;
          gap: 12px;
        }

        .program-card,
        .loose-section {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          box-shadow: var(--shadow-card);
        }

        .program-card {
          overflow: hidden;
        }

        .program-card.draft {
          opacity: 0.86;
        }

        .program-row {
          padding: 14px;
          align-items: stretch;
        }

        .program-cover {
          width: 160px;
          min-height: 104px;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--bg2), var(--bg-surface));
          display: grid;
          place-items: center;
          overflow: hidden;
          flex: 0 0 auto;
          font-size: 36px;
        }

        .program-cover img,
        .aula-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .program-main,
        .aula-main {
          min-width: 0;
          flex: 1;
        }

        .title-row {
          justify-content: flex-start;
          margin-bottom: 7px;
        }

        .program-meta,
        .aula-meta {
          justify-content: flex-start;
          margin-top: 9px;
          color: var(--text-2);
          font-size: 12px;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        .program-meta span,
        .aula-meta span,
        .aula-meta a {
          color: var(--text-2);
        }

        .aula-meta a {
          color: var(--blue);
          text-decoration: none;
          word-break: break-all;
        }

        .aula-meta a.disabled {
          pointer-events: none;
          color: var(--text-3);
        }

        .draft-badge {
          background: var(--gold-dim);
          border-color: rgba(255, 215, 0, 0.35);
          color: var(--gold);
        }

        .sessions {
          border-top: 1px solid var(--border-2);
          background: color-mix(in srgb, var(--bg2) 58%, transparent);
          padding: 12px 14px 14px;
          display: grid;
          gap: 10px;
        }

        .session-card {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          overflow: hidden;
        }

        .session-head {
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px;
          border-bottom: 1px solid var(--border-2);
        }

        .aula-list {
          display: grid;
          gap: 8px;
          padding: 10px;
        }

        .aula-row {
          display: grid;
          grid-template-columns: 82px 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          padding: 9px;
        }

        .aula-row.draft,
        .aula-row.hidden-item {
          opacity: 0.72;
        }

        .aula-thumb {
          width: 82px;
          height: 56px;
          border: 1px solid var(--border-2);
          border-radius: 10px;
          background: var(--bg-surface);
          display: grid;
          place-items: center;
          overflow: hidden;
          font-size: 22px;
        }

        .aula-title-row {
          justify-content: flex-start;
          margin-bottom: 4px;
        }

        .aula-actions {
          max-width: 240px;
        }

        .order-field {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-2);
          font-size: 11px;
          font-weight: 800;
        }

        .order-field input {
          width: 64px;
          border: 1px solid var(--border-2);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 5px 7px;
          font-size: 12px;
          font-family: var(--font-mono);
        }

        .empty-session {
          border: 1px dashed var(--border-3);
          border-radius: var(--radius-md);
          padding: 10px;
          color: var(--text-2);
          font-size: 13px;
        }

        .loose-section {
          margin-top: 14px;
          padding: 14px;
        }

        .loose-head {
          margin-bottom: 10px;
        }

        .legend {
          justify-content: flex-start;
          margin-top: 16px;
          color: var(--text-2);
          font-size: 12px;
        }

        @media (max-width: 980px) {
          .header,
          .program-row,
          .session-head,
          .loose-head {
            flex-direction: column;
          }

          .program-actions,
          .session-actions,
          .aula-actions {
            justify-content: flex-start;
          }

          .program-cover {
            width: 100%;
            min-height: 132px;
          }

          .aula-row {
            grid-template-columns: 82px 1fr;
          }

          .aula-actions {
            grid-column: span 2;
            max-width: none;
          }
        }

        @media (max-width: 620px) {
          .aula-row {
            grid-template-columns: 1fr;
          }

          .aula-thumb {
            width: 100%;
            height: 136px;
          }

          .aula-actions {
            grid-column: auto;
          }

          h1 {
            font-size: 26px;
          }
        }
      `}</style>
      <style jsx global>{`
        .admin-content-screen .aula-row {
          display: grid;
          grid-template-columns: 82px 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          padding: 9px;
        }

        .admin-content-screen .aula-row.draft,
        .admin-content-screen .aula-row.hidden-item {
          opacity: 0.72;
        }

        .admin-content-screen .aula-thumb {
          width: 82px;
          height: 56px;
          border: 1px solid var(--border-2);
          border-radius: 10px;
          background: var(--bg-surface);
          display: grid;
          place-items: center;
          overflow: hidden;
          font-size: 22px;
        }

        .admin-content-screen .aula-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-content-screen .aula-main {
          min-width: 0;
          flex: 1;
        }

        .admin-content-screen .aula-row h4,
        .admin-content-screen .aula-row p {
          margin: 0;
        }

        .admin-content-screen .aula-row h4 {
          color: var(--text);
          font-size: 14px;
          line-height: 1.25;
        }

        .admin-content-screen .aula-row p {
          color: var(--text-2);
          font-size: 13px;
          line-height: 1.4;
        }

        .admin-content-screen .aula-title-row,
        .admin-content-screen .aula-meta,
        .admin-content-screen .aula-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .admin-content-screen .aula-title-row {
          justify-content: flex-start;
          margin-bottom: 4px;
        }

        .admin-content-screen .aula-meta {
          justify-content: flex-start;
          margin-top: 9px;
          color: var(--text-2);
          font-size: 12px;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }

        .admin-content-screen .aula-meta span,
        .admin-content-screen .aula-meta a {
          color: var(--text-2);
        }

        .admin-content-screen .aula-meta a {
          color: var(--blue);
          text-decoration: none;
          word-break: break-all;
        }

        .admin-content-screen .aula-meta a.disabled {
          pointer-events: none;
          color: var(--text-3);
        }

        .admin-content-screen .aula-actions {
          justify-content: flex-end;
          max-width: 240px;
        }

        .admin-content-screen .aula-row .btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 12px;
          font-weight: 800;
          padding: 8px 10px;
          cursor: pointer;
          transition: var(--transition);
        }

        .admin-content-screen .aula-row .btn:hover {
          border-color: var(--green-mid);
          color: var(--green);
        }

        .admin-content-screen .aula-row .btn.small {
          min-height: 36px;
          padding: 6px 9px;
        }

        .admin-content-screen .aula-row .btn.danger {
          color: var(--red);
        }

        .admin-content-screen .aula-row .btn.danger:hover {
          border-color: var(--red);
        }

        .admin-content-screen .order-field {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-2);
          font-size: 11px;
          font-weight: 800;
        }

        .admin-content-screen .order-field input {
          width: 64px;
          border: 1px solid var(--border-2);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 5px 7px;
          font-size: 12px;
          font-family: var(--font-mono);
        }

        @media (max-width: 980px) {
          .admin-content-screen .aula-row {
            grid-template-columns: 82px 1fr;
          }

          .admin-content-screen .aula-actions {
            grid-column: span 2;
            justify-content: flex-start;
            max-width: none;
          }
        }

        @media (max-width: 620px) {
          .admin-content-screen .aula-row {
            grid-template-columns: 1fr;
          }

          .admin-content-screen .aula-thumb {
            width: 100%;
            height: 136px;
          }

          .admin-content-screen .aula-actions {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  );
}
