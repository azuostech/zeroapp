'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAdminPrograms } from '@/hooks/useAdminPrograms';

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

function countAulas(program) {
  return (program?.content_sessions || []).reduce((total, session) => total + (session?.member_area_content?.length || 0), 0);
}

function sortSessions(program) {
  return [...(program?.content_sessions || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
}

function nextSessionOrder(program) {
  const sessions = sortSessions(program);
  const maxOrder = sessions.reduce((max, session) => Math.max(max, Number(session?.order_index || 0)), 0);
  return maxOrder + 1;
}

function isForbiddenError(message) {
  const value = String(message || '').toLowerCase();
  return value.includes('forbidden') || value.includes('403');
}

export default function AdminProgramasPage() {
  const router = useRouter();
  const { programs, isLoading, error, refresh, updateProgram, deleteProgram, createSession, updateSession, deleteSession } = useAdminPrograms();
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState('');

  const sortedPrograms = useMemo(
    () => [...(programs || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0)),
    [programs]
  );

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

  const handleCreateSession = async (program) => {
    const title = window.prompt('Nome da sessão');
    if (!title || !title.trim()) return;
    await runAction(
      program.id,
      () =>
        createSession(program.id, {
          title: title.trim(),
          visibility: 'visible',
          order_index: nextSessionOrder(program)
        }),
      'Sessão criada.'
    );
    setExpanded((current) => ({ ...current, [program.id]: true }));
  };

  const handleEditProgram = async (program) => {
    const title = window.prompt('Novo nome do programa', program?.title || '');
    if (!title || !title.trim() || title.trim() === program?.title) return;
    await runAction(program.id, () => updateProgram(program.id, { title: title.trim() }), 'Programa atualizado.');
  };

  const handleEditSession = async (session) => {
    const title = window.prompt('Novo nome da sessão', session?.title || '');
    if (!title || !title.trim() || title.trim() === session?.title) return;
    await runAction(session.id, () => updateSession(session.id, { title: title.trim() }), 'Sessão atualizada.');
  };

  const handleDeleteSession = async (session) => {
    const ok = window.confirm(`Remover a sessão "${session?.title || 'sem título'}"? As aulas ficam sem sessão.`);
    if (!ok) return;
    await runAction(session.id, () => deleteSession(session.id), 'Sessão removida.');
  };

  const handleDeleteProgram = async (program) => {
    const ok = window.confirm(`Remover o programa "${program?.title || 'sem título'}"? As sessões serão removidas.`);
    if (!ok) return;
    await runAction(program.id, () => deleteProgram(program.id), 'Programa removido.');
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
    <div className="programs-screen">
      <div className="shell">
        <header className="header">
          <div>
            <Link href="/admin/conteudo" className="back-link">
              ← conteúdos
            </Link>
            <h1>Gerenciar Programas</h1>
            <p>Estrutura de conteúdo da área de membros.</p>
          </div>

          <div className="header-actions">
            <button type="button" className="btn ghost" onClick={refresh}>
              Atualizar
            </button>
            <button type="button" className="btn solid" onClick={() => router.push('/admin/conteudo/programas/novo')}>
              + Novo Programa
            </button>
          </div>
        </header>

        {feedback ? <div className="feedback">{feedback}</div> : null}
        {!isLoading && error && !isForbiddenError(error) ? <div className="feedback error">{error}</div> : null}

        <section className="program-list">
          {isLoading ? <div className="state-inline">Carregando programas...</div> : null}
          {!isLoading && sortedPrograms.length === 0 ? <div className="state-inline">Nenhum programa cadastrado.</div> : null}

          {sortedPrograms.map((program) => {
            const sessions = sortSessions(program);
            const aulasCount = countAulas(program);
            const isOpen = Boolean(expanded[program.id]);
            const thumb = String(program?.thumbnail_url || '').trim();

            return (
              <article key={program.id} className="program-card">
                <div className="program-row">
                  <span className="drag" aria-hidden="true">
                    ⠿
                  </span>
                  <div className="program-thumb" aria-hidden="true">
                    {thumb ? <img src={thumb} alt="" /> : <span>📚</span>}
                  </div>
                  <div className="program-main">
                    <div className="title-row">
                      <h2>{program.title || 'Sem título'}</h2>
                      <span className="badge badge-green">{TIER_LABELS[program.tier_required] || program.tier_required}</span>
                      <span className="badge badge-neutral">{VISIBILITY_LABELS[program.visibility] || program.visibility}</span>
                      {!program.is_published ? <span className="badge draft">Rascunho</span> : null}
                    </div>
                    <p>
                      {sessions.length} sessões · {aulasCount} aulas · Turma: {program.turma_exclusiva || 'todas'}
                    </p>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busyId === program.id}
                      onClick={() => handleEditProgram(program)}
                    >
                      ✏️ Editar
                    </button>
                    <button type="button" className="btn ghost" onClick={() => toggleExpanded(program.id)}>
                      📂 {isOpen ? 'Ocultar' : 'Ver sessões'}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busyId === program.id}
                      onClick={() =>
                        runAction(
                          program.id,
                          () => updateProgram(program.id, { is_published: !program.is_published }),
                          program.is_published ? 'Programa movido para rascunho.' : 'Programa publicado.'
                        )
                      }
                    >
                      👁 {program.is_published ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button type="button" className="btn danger" disabled={busyId === program.id} onClick={() => handleDeleteProgram(program)}>
                      🗑
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="sessions">
                    <div className="sessions-head">
                      <strong>Sessões</strong>
                      <button type="button" className="btn small" disabled={busyId === program.id} onClick={() => handleCreateSession(program)}>
                        + Sessão
                      </button>
                    </div>

                    {sessions.length === 0 ? <div className="empty-session">Nenhuma sessão criada.</div> : null}

                    {sessions.map((session) => (
                      <div key={session.id} className="session-row">
                        <span className="drag" aria-hidden="true">
                          ⠿
                        </span>
                        <div className="session-main">
                          <h3>{session.title || 'Sem título'}</h3>
                          <p>
                            {VISIBILITY_LABELS[session.visibility] || session.visibility} · {session.member_area_content?.length || 0} aulas
                          </p>
                        </div>
                        <div className="session-actions">
                          <button type="button" className="btn small" onClick={() => handleEditSession(session)}>
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => router.push(`/admin/conteudo/novo?session_id=${encodeURIComponent(session.id)}`)}
                          >
                            + Aula
                          </button>
                          <button type="button" className="btn small danger" onClick={() => handleDeleteSession(session)}>
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <footer className="legend">
          <span>● Visível = aluno acessa normalmente</span>
          <span>🔒 Bloqueado = aluno vê o card, não acessa</span>
          <span>👁 Oculto = não aparece para o aluno</span>
        </footer>
      </div>

      <style jsx>{`
        .programs-screen {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 0, var(--green-dim), transparent 42%), var(--bg-deep);
          color: var(--text);
          padding: 18px 14px 36px;
        }

        .shell {
          max-width: 1120px;
          margin: 0 auto;
        }

        .header,
        .program-row,
        .title-row,
        .actions,
        .sessions-head,
        .session-row,
        .session-actions,
        .legend {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header {
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .back-link {
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
        }

        h1 {
          margin: 6px 0 4px;
          font-family: var(--font-display);
          font-size: 30px;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 13px;
        }

        .header-actions,
        .actions {
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
        }

        .btn.solid {
          background: var(--green);
          color: #03150a;
          border-color: var(--green);
        }

        .btn.small {
          min-height: 36px;
          padding: 6px 9px;
        }

        .btn.danger {
          color: var(--red);
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

        .program-card {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          padding: 14px;
        }

        .program-row {
          align-items: center;
        }

        .drag {
          color: var(--text-3);
          font-size: 18px;
        }

        .program-thumb {
          width: 72px;
          height: 54px;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          overflow: hidden;
          display: grid;
          place-items: center;
          font-size: 24px;
          flex: 0 0 auto;
        }

        .program-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .program-main,
        .session-main {
          min-width: 0;
          flex: 1;
        }

        h2,
        h3 {
          margin: 0;
          line-height: 1.2;
        }

        h2 {
          font-size: 18px;
          font-family: var(--font-display);
        }

        h3 {
          font-size: 14px;
        }

        .title-row {
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .draft {
          background: var(--gold-dim);
          border-color: rgba(255, 215, 0, 0.35);
          color: var(--gold);
        }

        .sessions {
          margin: 12px 0 0 92px;
          border-left: 1px solid var(--border-2);
          padding-left: 14px;
          display: grid;
          gap: 8px;
        }

        .sessions-head {
          justify-content: space-between;
        }

        .session-row {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          padding: 10px;
        }

        .empty-session {
          color: var(--text-2);
          font-size: 13px;
          padding: 8px 0;
        }

        .legend {
          flex-wrap: wrap;
          margin-top: 16px;
          color: var(--text-2);
          font-size: 12px;
        }

        @media (max-width: 860px) {
          .header,
          .program-row,
          .session-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .actions,
          .session-actions {
            justify-content: flex-start;
          }

          .sessions {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
