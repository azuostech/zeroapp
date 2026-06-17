'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BoardGrid,
  CategoryLegend,
  IndexCard,
  ProgressSummary,
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { useShamarBoard } from '@/hooks/useShamarBoard';
import { formatMoney, identityLabel, seasonDay } from '@/src/lib/shamar/formatters';
import { modePath, modeTitle } from '@/components/shamar/ShamarModeCreator';

function currentStreakFromIndex(indexData) {
  const score = Number(indexData?.score_constancia || 0);
  return Math.max(0, Math.round(score / 60));
}

function emotionalTrigger(progress, indexData) {
  const total = Number(progress?.contributions_total || 0);
  const identity = identityLabel(indexData?.identity_level);

  if (total <= 0) return 'O primeiro quadrinho é uma decisão pequena que começa a mudar sua identidade.';
  if (Number(indexData?.index_total || 0) >= 700) return `${identity}: você já está construindo patrimônio como prioridade, não como sobra.`;
  return 'Cada quadrinho marcado é uma prova de que você escolheu guardar antes de gastar.';
}

export function ShamarDashboard({ mode = 'individual' }) {
  const router = useRouter();
  const { season, config, progress, indexData, locked, unlockProgress, error, isLoading } = useShamar(mode);
  const { squares, stats: boardStats, isLoading: isBoardLoading } = useShamarBoard(season?.id);
  const [recentContributions, setRecentContributions] = useState([]);
  const title = modeTitle(mode);
  const modeQuery = `mode=${encodeURIComponent(mode)}`;

  useEffect(() => {
    let active = true;

    const loadRecent = async () => {
      if (!season?.id) {
        setRecentContributions([]);
        return;
      }

      try {
        const res = await fetch(`/api/shamar/contributions?season_id=${encodeURIComponent(season.id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'contributions_fetch_failed');
        if (active) setRecentContributions((data?.contributions || []).slice(0, 3));
      } catch (_) {
        if (active) setRecentContributions([]);
      }
    };

    loadRecent();
    return () => {
      active = false;
    };
  }, [season?.id]);

  const day = useMemo(() => seasonDay(config), [config]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  if (!season || !config) {
    return (
      <ShamarShell activeTab="shamar">
        <ShamarHeader
          hrefBack="/shamar"
          label="Jornada SHAMAR"
          title={`SHAMAR ${title}`}
          subtitle="Você ainda não tem um SHAMAR ativo nessa modalidade."
          stats={[
            { label: 'Status', value: 'Livre' },
            { label: 'Modalidade', value: title },
            { label: 'Próximo passo', value: 'Criar' }
          ]}
        />
        <ShamarCard title="Começar modalidade">
          <div className="dashboard-empty">
            <p>Crie essa modalidade para abrir seu tabuleiro e registrar aportes. Se for Dupla ou Tribo, os convidados entram apenas depois de aceitar.</p>
            <Link href={`/shamar/criar?mode=${encodeURIComponent(mode)}`}>Criar SHAMAR {title}</Link>
          </div>
        </ShamarCard>
        <ShamarDashboardStyles />
      </ShamarShell>
    );
  }

  const markedSquares = Number(progress?.squares_marked || boardStats?.marked || 0);
  const totalSquares = Number(progress?.squares_total || boardStats?.total || 0);
  const accumulated = Number(progress?.contributions_total || boardStats?.sum_marked || 0);
  const streak = currentStreakFromIndex(indexData);

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        hrefBack="/shamar"
        label={`Jornada SHAMAR · ${title}`}
        title={`SHAMAR ${title}`}
        subtitle={`Temporada ${config.duration_days} dias · Dia ${day.current} de ${day.total} · Meta ${formatMoney(config.meta_total)}`}
        identity={indexData?.identity_level || season.identity_level}
        stats={[
          { label: 'Patrimônio', value: formatMoney(accumulated, { compact: true }) },
          { label: 'Quadrinhos', value: `${markedSquares}/${totalSquares || '—'}` },
          { label: 'Sequência', value: `${streak}🔥` }
        ]}
      />

      <IndexCard indexData={indexData} />
      <ProgressSummary progress={progress} config={config} />

      <ShamarCard
        title="Progresso do Tabuleiro"
        action={<Link className="shamar-card-link" href={`/shamar/tabuleiro?${modeQuery}`}>Ver completo</Link>}
      >
        {isBoardLoading ? (
          <p className="shamar-inline-muted">Carregando tabuleiro...</p>
        ) : squares.length > 0 ? (
          <>
            <CategoryLegend compact />
            <BoardGrid squares={squares} preview onSquareClick={() => router.push(`/shamar/tabuleiro?${modeQuery}`)} />
          </>
        ) : (
          <p className="shamar-inline-muted">O tabuleiro ainda não foi gerado.</p>
        )}
      </ShamarCard>

      <section className="shamar-emotional-card">
        <strong>{identityLabel(indexData?.identity_level || season.identity_level)}</strong>
        <p>{emotionalTrigger(progress, indexData)}</p>
      </section>

      <div className="shamar-action-row">
        <Link href={`/shamar/aporte/novo?${modeQuery}`} className="shamar-cta">
          Registrar Aporte
        </Link>
        <Link href={`/shamar/encerramento?${modeQuery}`} className="shamar-closing-link">
          Encerrar SHAMAR
        </Link>
      </div>

      <ShamarCard title="Aportes recentes">
        {recentContributions.length > 0 ? (
          <div className="shamar-recent-list">
            {recentContributions.map((item) => (
              <div className="shamar-recent-item" key={item.id}>
                <div>
                  <strong>{formatMoney(item.amount)}</strong>
                  <span>{item.observation || 'Aporte registrado'}</span>
                </div>
                <time>{item.contributed_at}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="shamar-inline-muted">Nenhum aporte registrado ainda.</p>
        )}
      </ShamarCard>

      <ShamarDashboardStyles />
    </ShamarShell>
  );
}

export function ShamarDashboardStyles() {
  return (
    <style jsx global>{`
      .dashboard-empty {
        display: grid;
        gap: 12px;
      }

      .dashboard-empty p {
        margin: 0;
        color: var(--text2);
        font-size: 13px;
        line-height: 1.6;
      }

      .dashboard-empty a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        border-radius: var(--radius-md);
        background: var(--shamar-dark);
        color: white;
        font-weight: 900;
        padding: 14px 18px;
        box-shadow: 0 4px 16px rgba(27, 94, 32, 0.24);
      }

      .shamar-action-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
      }

      .shamar-action-row a {
        min-height: 46px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        font-weight: 900;
        padding: 12px 14px;
        text-align: center;
      }

      .shamar-card-link {
        color: var(--shamar-dark);
        font-size: 12px;
        font-weight: 800;
      }

      .shamar-emotional-card {
        border: 1px solid rgba(27, 94, 32, 0.15);
        background: var(--shamar-dim);
        border-radius: var(--radius-xl);
        padding: 16px;
        margin-bottom: 14px;
      }

      .shamar-emotional-card strong {
        display: block;
        color: var(--shamar-dark);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 4px;
      }

      .shamar-emotional-card p,
      .shamar-inline-muted {
        margin: 0;
        color: var(--text2);
        font-size: 13px;
        line-height: 1.6;
      }

      .shamar-cta {
        background: var(--shamar-dark);
        color: white;
        box-shadow: 0 4px 16px rgba(27, 94, 32, 0.24);
      }

      .shamar-closing-link {
        border: 1px solid color-mix(in srgb, var(--shamar-gold) 55%, transparent);
        background: color-mix(in srgb, var(--shamar-gold) 12%, transparent);
        color: #7a5a00;
      }

      .shamar-recent-list {
        display: grid;
        gap: 10px;
      }

      .shamar-recent-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 10px;
      }

      .shamar-recent-item:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .shamar-recent-item strong {
        display: block;
        color: var(--shamar-dark);
        font-family: var(--font-mono);
        font-size: 14px;
      }

      .shamar-recent-item span,
      .shamar-recent-item time {
        display: block;
        color: var(--text3);
        font-size: 11px;
      }

      @media (max-width: 560px) {
        .shamar-action-row {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
