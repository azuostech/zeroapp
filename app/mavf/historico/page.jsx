'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import WheelChart from '@/components/mavf/WheelChart';
import MAVFPaywall from '@/components/mavf/MAVFPaywall';
import MAVFAppShell from '@/components/mavf/MAVFAppShell';
import { MAVF_PILLARS } from '@/lib/mavf-config';
import styles from './historico.module.css';

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

export default function MAVFHistoricoPage({ adminViewUserId = null, adminClientLabel = '' }) {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentTier, setCurrentTier] = useState('DESPERTAR');
  const [sessions, setSessions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [responsesMap, setResponsesMap] = useState({});
  const adminMode = Boolean(adminViewUserId);
  const targetUserId = adminMode ? adminViewUserId : null;
  const backHref = adminMode ? `/admin/users/${encodeURIComponent(adminViewUserId)}/mavf` : '/mavf';

  useEffect(() => {
    bootstrap();
  }, [adminViewUserId]);

  const selectedSessions = useMemo(
    () => sessions.filter((session) => selectedIds.includes(session.id)),
    [sessions, selectedIds]
  );

  const bootstrap = async () => {
    try {
      const res = await fetch(withUserQuery('/api/mavf/sessions', targetUserId), { cache: 'no-store' });
      const data = await res.json();

      if (res.status === 403) {
        setAccessDenied(true);
        setCurrentTier(data.current_tier || 'DESPERTAR');
        setLoading(false);
        return;
      }

      const completedSessions = (data.sessions || []).filter((session) => session.status === 'completed');
      setSessions(completedSessions);

      const defaultSelected = completedSessions.slice(0, 3).map((session) => session.id);
      setSelectedIds(defaultSelected);

      await loadResponses(defaultSelected);
    } catch (error) {
      console.error('Erro ao carregar histórico MAVF:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (sessionIds) => {
    const entries = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const res = await fetch(withUserQuery(`/api/mavf/responses?session_id=${sessionId}`, targetUserId), {
          cache: 'no-store'
        });
        const data = await res.json();
        return [sessionId, data.responses || []];
      })
    );

    setResponsesMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  const toggleSession = async (sessionId) => {
    const currentlySelected = selectedIds.includes(sessionId);
    if (currentlySelected) {
      const next = selectedIds.filter((id) => id !== sessionId);
      setSelectedIds(next);
      return;
    }

    if (selectedIds.length >= 3) return;
    const next = [...selectedIds, sessionId];
    setSelectedIds(next);
    await loadResponses([sessionId]);
  };

  if (loading) {
    return (
      <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
        <div className={styles.page}><div className={styles.loading}>Carregando histórico...</div></div>
      </MAVFAppShell>
    );
  }

  if (accessDenied) {
    return (
      <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
        <div className={styles.page}>
          <MAVFPaywall currentTier={currentTier} />
        </div>
      </MAVFAppShell>
    );
  }

  return (
    <MAVFAppShell activeTab="mavf" hideNavigation={adminMode}>
      <div className={styles.page}>
        {adminMode ? (
          <div className={styles.adminBanner}>
            <strong>Modo admin:</strong>{' '}
            {adminClientLabel || 'histórico MAVF do cliente'}.
            <Link href="/admin">Voltar ao painel</Link>
          </div>
        ) : null}
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Evolução dos seus pilares</p>
            <h1>MAVF Histórico</h1>
            <p className={styles.headerDescription}>Selecione até 3 sessões finalizadas para comparar sua evolução na escala de 0 a 10.</p>
          </div>
          <Link href={backHref} className={styles.backButton}>← Voltar ao MAVF</Link>
        </header>

        <div className={styles.layout}>
          <aside className={styles.card}>
            <div className={styles.cardHeader}>
              <div><h2>Sessões disponíveis</h2><p>Escolha até três para comparar.</p></div>
              <span className={styles.selectionCount}>{selectedIds.length}/3</span>
            </div>
            <div className={styles.sessionList}>
              {sessions.map((session) => {
                const checked = selectedIds.includes(session.id);
                const disabled = !checked && selectedIds.length >= 3;
                return (
                  <label
                    key={session.id}
                    className={`${styles.sessionOption} ${checked ? styles.sessionSelected : ''} ${disabled ? styles.sessionDisabled : ''}`}
                  >
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSession(session.id)} className={styles.checkbox} />
                    <span className={styles.colorDot} style={{ background: session.color_hex }} />
                    <span className={styles.sessionText}>
                      <strong>{session.title}</strong>
                      <span>{session.completed_at ? new Date(session.completed_at).toLocaleDateString('pt-BR') : '—'}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </aside>

          <main className={styles.mainColumn}>
            <section className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h2>Roda de evolução</h2>
                <p>Cada eixo representa um pilar; centro = 0 e borda = 10.</p>
              </div>
              {selectedSessions.length === 0 ? (
                <div className={styles.empty}>Selecione pelo menos uma sessão para visualizar a comparação.</div>
              ) : (
                <>
                  <div className={styles.chartBody}><WheelChart sessions={selectedSessions} responsesMap={responsesMap} /></div>
                  <div className={styles.scaleLegend} aria-label="Escala do gráfico">
                    <span>Centro: 0</span><span>Anel 1: 2</span><span>Anel 2: 4</span><span>Anel 3: 6</span><span>Anel 4: 8</span><span>Borda: 10</span>
                  </div>
                  <div className={styles.legend}>
                    {selectedSessions.map((session) => (
                      <div key={session.id} className={styles.legendItem}>
                        <span className={styles.legendLine} style={{ background: session.color_hex }} />
                        {session.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {selectedSessions.length > 0 ? (
              <section className={styles.comparisonCard}>
                <div className={styles.comparisonHeader}><h2>Notas por pilar</h2><p>Valores exatos usados para desenhar cada linha do gráfico.</p></div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Pilar</th>{selectedSessions.map((session) => <th key={session.id}>{session.title}</th>)}</tr></thead>
                    <tbody>
                      {MAVF_PILLARS.map((pillar) => (
                        <tr key={pillar.id}>
                          <td><span className={styles.pillarName}>{pillar.emoji} {pillar.label}</span></td>
                          {selectedSessions.map((session) => {
                            const response = (responsesMap[session.id] || []).find((item) => item.pillar === pillar.id);
                            return <td key={session.id}><span className={styles.score}>{response?.score ?? '—'}</span></td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </MAVFAppShell>
  );
}
