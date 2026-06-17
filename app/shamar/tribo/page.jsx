'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BoardGrid,
  CategoryLegend,
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { useShamarBoard } from '@/hooks/useShamarBoard';
import { formatMoney, formatPercent, identityLabel } from '@/src/lib/shamar/formatters';

export default function ShamarTriboPage() {
  const router = useRouter();
  const { season, config, progress, locked, unlockProgress, error, isLoading } = useShamar('tribo');
  const { squares, stats: boardStats, error: boardError, isLoading: isBoardLoading } = useShamarBoard(season?.id);
  const [tribo, setTribo] = useState(null);
  const [triboError, setTriboError] = useState(null);
  const [isTriboLoading, setIsTriboLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTribo = async () => {
      if (!season?.tribo_config_id) return;
      setIsTriboLoading(true);
      setTriboError(null);

      try {
        const res = await fetch(`/api/shamar/tribo?tribo_config_id=${encodeURIComponent(season.tribo_config_id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'shamar_tribo_fetch_failed');
        if (active) setTribo(data);
      } catch (fetchError) {
        if (active) {
          setTribo(null);
          setTriboError(fetchError?.message || 'shamar_tribo_fetch_failed');
        }
      } finally {
        if (active) setIsTriboLoading(false);
      }
    };

    loadTribo();
    return () => {
      active = false;
    };
  }, [season?.tribo_config_id]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  if (!season) {
    return (
      <ShamarShell activeTab="tribo">
        <ShamarHeader
          hrefBack="/shamar"
          label="SHAMAR Tribo"
          title="Tribo"
          subtitle="Você ainda não tem uma Tribo ativa."
          stats={[
            { label: 'Pessoas', value: '3+' },
            { label: 'Status', value: 'Livre' },
            { label: 'Controle', value: 'Individual' }
          ]}
        />
        <ShamarCard title="Criar Tribo">
          <div className="tribo-empty">
            <p>Crie uma Tribo convidando pelo menos duas pessoas. Cada participante terá o próprio tabuleiro após aceitar.</p>
            <Link href="/shamar/criar?mode=tribo">Criar SHAMAR Tribo</Link>
          </div>
        </ShamarCard>
        <style jsx>{`
          .tribo-empty {
            display: grid;
            gap: 12px;
          }

          .tribo-empty p {
            margin: 0;
            color: var(--text2);
            font-size: 13px;
            line-height: 1.6;
          }

          .tribo-empty a {
            border-radius: var(--radius-md);
            background: var(--shamar-dark);
            color: white;
            font-weight: 900;
            padding: 13px 16px;
            text-align: center;
          }
        `}</style>
      </ShamarShell>
    );
  }

  const stats = tribo?.stats || {};
  const ranking = tribo?.ranking || [];
  const feed = tribo?.feed || [];
  const modeQuery = 'mode=tribo';
  const markedSquares = Number(progress?.squares_marked || boardStats?.marked || 0);
  const totalSquares = Number(progress?.squares_total || boardStats?.total || 0);
  const accumulated = Number(progress?.contributions_total || boardStats?.sum_marked || 0);

  return (
    <ShamarShell activeTab="tribo">
      <ShamarHeader
        label={`Camada 3 · Turma ${config?.turma || 'SHAMAR'}`}
        title="👥 TRIBO"
        subtitle={`${Number(stats.guardians || 0)} guardiões construindo patrimônio juntos`}
        stats={[
          { label: 'Patrimônio', value: formatMoney(stats.patrimonio_total || 0, { compact: true }) },
          { label: 'Meta coletiva', value: formatPercent(stats.progress_pct || 0) },
          { label: 'Constância', value: Number(stats.constancia_media || 0) }
        ]}
      />

      {isTriboLoading ? <ShamarCard><p className="tribo-muted">Carregando TRIBO...</p></ShamarCard> : null}
      {triboError ? <ShamarCard><p className="tribo-muted">{triboError}</p></ShamarCard> : null}

      <section className="tribo-meta-card">
        <div className="tribo-meta-head">
          <span>Meta Coletiva da TRIBO</span>
          <div>
            <strong>{formatMoney(stats.patrimonio_total || 0)}</strong>
            <em>de {formatMoney(stats.meta_total || config?.meta_total || 0)}</em>
          </div>
        </div>
        <div className="tribo-meta-body">
          <div className="tribo-track">
            <div style={{ width: `${Math.max(0, Math.min(100, Number(stats.progress_pct || 0)))}%` }} />
          </div>
          <div className="tribo-meta-stats">
            <div><strong>{Number(stats.guardians || 0)}</strong><span>guardiões</span></div>
            <div><strong>{Number(stats.squares_marked_total || 0)}</strong><span>quadrinhos</span></div>
            <div><strong>{formatMoney(stats.faltam || 0, { compact: true })}</strong><span>faltam</span></div>
          </div>
        </div>
      </section>

      <ShamarCard
        title="Meu tabuleiro na TRIBO"
        action={<Link className="tribo-card-link" href={`/shamar/tabuleiro?${modeQuery}`}>Ver completo</Link>}
      >
        <div className="tribo-board-summary">
          <div>
            <strong>{formatMoney(accumulated, { compact: true })}</strong>
            <span>meu patrimônio</span>
          </div>
          <div>
            <strong>{markedSquares}/{totalSquares || '—'}</strong>
            <span>meus quadrinhos</span>
          </div>
          <div>
            <strong>{formatMoney(config?.meta_total || boardStats?.sum_total || 0, { compact: true })}</strong>
            <span>minha meta</span>
          </div>
        </div>

        <p className="tribo-board-note">
          Seus aportes são lançados no seu próprio tabuleiro e também entram na soma coletiva da TRIBO.
        </p>

        {boardError ? <p className="tribo-muted">{boardError}</p> : null}
        {isBoardLoading ? <p className="tribo-muted">Carregando seu tabuleiro...</p> : null}
        {!isBoardLoading && squares.length > 0 ? (
          <>
            <CategoryLegend compact />
            <BoardGrid squares={squares} preview onSquareClick={() => router.push(`/shamar/tabuleiro?${modeQuery}`)} />
          </>
        ) : null}
        {!isBoardLoading && !boardError && squares.length === 0 ? (
          <p className="tribo-muted">Seu tabuleiro ainda não foi gerado.</p>
        ) : null}

        <div className="tribo-board-actions">
          <Link href={`/shamar/aporte/novo?${modeQuery}`} className="tribo-primary-action">
            Registrar Aporte
          </Link>
          <Link href={`/shamar/tabuleiro?${modeQuery}`} className="tribo-secondary-action">
            Abrir Tabuleiro
          </Link>
        </div>
      </ShamarCard>

      <ShamarCard title="Ranking Constância">
        {ranking.length === 0 ? <p className="tribo-muted">Ranking ainda sem dados.</p> : null}
        <div className="ranking-list">
          {ranking.slice(0, 5).map((item) => (
            <div className={`ranking-row${item.current_user ? ' current' : ''}`} key={item.season_id}>
              <span className="ranking-pos">{item.position}</span>
              <span className="ranking-avatar">{item.avatar}</span>
              <div>
                <strong>{item.name}</strong>
                <em>{identityLabel(item.identity_level)}</em>
              </div>
              <div className="ranking-right">
                <strong>{item.index_total}</strong>
                <em>{item.weeks} semanas</em>
              </div>
            </div>
          ))}
        </div>
      </ShamarCard>

      <ShamarCard title="Feed da TRIBO">
        {feed.length === 0 ? <p className="tribo-muted">Nenhuma ação recente ainda.</p> : null}
        <div className="tribo-feed">
          {feed.map((event) => (
            <div className="tribo-feed-row" key={event.id}>
              <span>💰</span>
              <div>
                <strong>{event.title}</strong>
                <em>{formatMoney(event.amount)} · {event.date}</em>
              </div>
            </div>
          ))}
        </div>
      </ShamarCard>

      <style jsx>{`
        .tribo-muted {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
        }

        .tribo-card-link {
          color: var(--shamar-dark);
          font-size: 12px;
          font-weight: 800;
        }

        .tribo-board-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .tribo-board-summary div {
          border-radius: 12px;
          background: var(--shamar-dim);
          padding: 12px;
          text-align: center;
        }

        .tribo-board-summary strong {
          display: block;
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 14px;
        }

        .tribo-board-summary span {
          display: block;
          color: var(--text3);
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .tribo-board-note {
          margin: 0 0 12px;
          color: var(--text2);
          font-size: 12px;
          line-height: 1.5;
        }

        .tribo-board-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .tribo-board-actions a {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          font-weight: 900;
          padding: 12px 14px;
          text-align: center;
        }

        .tribo-primary-action {
          background: var(--shamar-dark);
          color: white;
          box-shadow: 0 4px 16px rgba(27, 94, 32, 0.24);
        }

        .tribo-secondary-action {
          border: 1px solid rgba(27, 94, 32, 0.22);
          background: var(--shamar-dim);
          color: var(--shamar-dark);
        }

        .tribo-meta-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          margin-bottom: 14px;
        }

        .tribo-meta-head {
          background: var(--shamar-dark);
          color: white;
          padding: 14px 16px;
        }

        .tribo-meta-head span {
          display: block;
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .tribo-meta-head div {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }

        .tribo-meta-head strong {
          color: var(--shamar-gold);
          font-family: var(--font-mono);
          font-size: 22px;
        }

        .tribo-meta-head em {
          color: rgba(255,255,255,0.7);
          font-style: normal;
          font-size: 12px;
          font-weight: 700;
        }

        .tribo-meta-body {
          padding: 14px 16px;
        }

        .tribo-track {
          height: 10px;
          border-radius: var(--radius-full);
          background: var(--green-mid);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .tribo-track div {
          height: 100%;
          border-radius: var(--radius-full);
          background: var(--shamar-dark);
        }

        .tribo-meta-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .tribo-meta-stats div {
          text-align: center;
        }

        .tribo-meta-stats strong {
          display: block;
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 14px;
        }

        .tribo-meta-stats span {
          color: var(--text3);
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ranking-list,
        .tribo-feed {
          display: grid;
          gap: 0;
        }

        .ranking-row,
        .tribo-feed-row {
          display: grid;
          grid-template-columns: 26px 38px 1fr auto;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding: 11px 0;
        }

        .tribo-feed-row {
          grid-template-columns: 32px 1fr;
        }

        .ranking-row:last-child,
        .tribo-feed-row:last-child {
          border-bottom: 0;
        }

        .ranking-row.current {
          border-radius: 12px;
          background: var(--shamar-dim);
          padding-left: 8px;
          padding-right: 8px;
        }

        .ranking-pos {
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-weight: 900;
          text-align: center;
        }

        .ranking-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--shamar-dark);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .ranking-row strong,
        .tribo-feed-row strong {
          display: block;
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
        }

        .ranking-row em,
        .tribo-feed-row em {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-style: normal;
        }

        .ranking-right {
          text-align: right;
        }

        .ranking-right strong {
          color: var(--shamar-dark);
          font-family: var(--font-mono);
        }

        @media (max-width: 560px) {
          .tribo-board-summary,
          .tribo-board-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
