'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { modePath } from '@/components/shamar/ShamarModeCreator';
import { formatMoney, formatPercent } from '@/src/lib/shamar/formatters';

export default function ShamarBoardPage() {
  const [mode, setMode] = useState('');
  const { season, config, locked, unlockProgress, error, isLoading } = useShamar(mode);
  const { squares, stats, isLoading: isBoardLoading } = useShamarBoard(season?.id);
  const [contributionsById, setContributionsById] = useState(new Map());
  const [selectedSquare, setSelectedSquare] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode') || '';
    if (['individual', 'dupla', 'tribo'].includes(requestedMode)) setMode(requestedMode);
  }, []);

  useEffect(() => {
    let active = true;

    const loadContributions = async () => {
      if (!season?.id) return;

      try {
        const res = await fetch(`/api/shamar/contributions?season_id=${encodeURIComponent(season.id)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'contributions_fetch_failed');
        const nextMap = new Map((data?.contributions || []).map((item) => [item.id, item]));
        if (active) setContributionsById(nextMap);
      } catch (_) {
        if (active) setContributionsById(new Map());
      }
    };

    loadContributions();
    return () => {
      active = false;
    };
  }, [season?.id]);

  const progressPct = useMemo(() => {
    const total = Number(stats?.sum_total || config?.meta_total || 0);
    const marked = Number(stats?.sum_marked || 0);
    return total > 0 ? (marked / total) * 100 : 0;
  }, [config?.meta_total, stats?.sum_marked, stats?.sum_total]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  const selectedContribution = selectedSquare?.contribution_id ? contributionsById.get(selectedSquare.contribution_id) : null;

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        hrefBack={mode ? modePath(mode) : '/shamar'}
        label="Tabuleiro SHAMAR"
        title="🟩 Tabuleiro"
        subtitle={`Turma ${config?.turma || 'SHAMAR'} · ${Number(stats?.marked || 0)} marcados · ${formatMoney(config?.meta_total || stats?.sum_total || 0)} total`}
        right={<div className="board-progress-big">{formatPercent(progressPct)}</div>}
      />

      <ShamarCard title="Categorias">
        <CategoryLegend />
      </ShamarCard>

      <ShamarCard title="Grid interativo">
        {isBoardLoading ? (
          <p className="board-muted">Carregando tabuleiro...</p>
        ) : squares.length > 0 ? (
          <BoardGrid squares={squares} onSquareClick={(square) => setSelectedSquare(square.marked ? square : null)} />
        ) : (
          <p className="board-muted">O tabuleiro ainda não foi gerado.</p>
        )}
      </ShamarCard>

      {selectedSquare ? (
        <ShamarCard title={`Quadrinho ${selectedSquare.position}`}>
          <div className="square-detail">
            <div>
              <strong>{formatMoney(selectedSquare.value)}</strong>
              <span>{selectedSquare.category}</span>
            </div>
            <div>
              <strong>{selectedSquare.marked_at ? new Date(selectedSquare.marked_at).toLocaleDateString('pt-BR') : 'Marcado'}</strong>
              <span>{selectedContribution?.observation || 'Sem observação'}</span>
            </div>
          </div>
        </ShamarCard>
      ) : null}

      <ShamarCard title="Resumo">
        <div className="board-footer-stats">
          <div><strong>{Number(stats?.total || 0)}</strong><span>Total</span></div>
          <div><strong>{Number(stats?.marked || 0)}</strong><span>Marcados</span></div>
          <div><strong>{Number(stats?.available || 0)}</strong><span>Disponíveis</span></div>
          <div><strong>{formatMoney(stats?.sum_marked || 0, { compact: true })}</strong><span>Soma marcada</span></div>
        </div>
      </ShamarCard>

      <style jsx>{`
        .board-progress-big {
          color: var(--shamar-gold);
          font-family: var(--font-mono);
          font-size: 24px;
          font-weight: 900;
          white-space: nowrap;
        }

        .board-muted {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
        }

        .square-detail,
        .board-footer-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .board-footer-stats {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .square-detail div,
        .board-footer-stats div {
          border-radius: 12px;
          background: var(--shamar-dim);
          padding: 12px;
          text-align: center;
        }

        .square-detail strong,
        .board-footer-stats strong {
          display: block;
          color: var(--shamar-dark);
          font-family: var(--font-mono);
          font-size: 14px;
        }

        .square-detail span,
        .board-footer-stats span {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 2px;
        }

        @media (max-width: 560px) {
          .board-footer-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </ShamarShell>
  );
}
