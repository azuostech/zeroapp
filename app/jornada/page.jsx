'use client';

import { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import { useJornada } from '@/hooks/useJornada';

const UPGRADE_LINK = 'https://wa.me/';
const THEME_KEY = 'zeroapp-theme';

function formatCoins(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function ensureThemeAttribute() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved === 'dark' || saved === 'light' ? saved : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

export default function JornadaPage() {
  const { coinsAtual, coinsTotal, faseAtual, progressoPct, coinsParaProxima, proximaFase, transactions, fases, isLoading, error, refresh } =
    useJornada();
  const [tier, setTier] = useState('DESPERTAR');
  const [isIAOpen, setIsIAOpen] = useState(false);

  useEffect(() => {
    ensureThemeAttribute();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTier = async () => {
      try {
        const response = await fetch('/api/user/tier', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        if (mounted) {
          setTier(String(payload?.tier || 'DESPERTAR').toUpperCase());
        }
      } catch (_) {
        // no-op
      }
    };

    loadTier();
    return () => {
      mounted = false;
    };
  }, []);

  const tierPremiumLocked = tier !== 'AUTOGOVERNO';
  const latestTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  return (
    <div className="jornada-screen">
      <AppHeader />

      <main className="jornada-shell">
        <header className="jornada-header">
          <div>
            <h1 className="text-display">Conquistas 🏆</h1>
            <p>Sua trilha de ZeroCoins e recompensas</p>
          </div>
          <button type="button" className="btn-refresh" onClick={refresh}>
            Atualizar
          </button>
        </header>

        <section className="coins-strip">
          <div className="strip-main">
            <span className="strip-balance">🪙 {formatCoins(coinsAtual)} saldo atual</span>
            <strong className="strip-total">{formatCoins(coinsTotal)} ZeroCoins totais</strong>
          </div>
          <div className="strip-phase">
            <span className="badge badge-gold">
              Fase: {faseAtual?.emoji} {faseAtual?.nome || 'Bombeiro'}
            </span>
            {proximaFase ? (
              <small>{coinsParaProxima} 🪙 para {proximaFase.nome}</small>
            ) : (
              <small>Fase máxima alcançada</small>
            )}
          </div>
        </section>

        {isLoading ? <div className="feedback">Carregando jornada...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}

        {!isLoading && !error ? (
          <section className="timeline">
            {fases.map((fase) => {
              const isCurrent = faseAtual?.id === fase.id;
              const isDone = Number.isFinite(fase.max) ? coinsTotal > fase.max : coinsTotal >= fase.min;
              const unlocked = coinsTotal >= fase.min;
              const isLocked = !unlocked;

              return (
                <article key={fase.id} className={`fase-card ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}>
                  <div className={`fase-icon ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}>
                    {isDone ? '✓' : fase.emoji}
                  </div>
                  <div className="fase-body">
                    <h2>{fase.nome}</h2>
                    <p>{fase.descricao}</p>

                    {isCurrent ? (
                      <div className="progress-wrap">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${progressoPct}%` }} />
                        </div>
                        <small>{progressoPct}% desta fase</small>
                      </div>
                    ) : null}

                    <div className="chips">
                      {fase.recompensas.map((reward) => {
                        const rewardUnlocked = unlocked;
                        return (
                          <span key={reward} className={`chip badge ${rewardUnlocked ? 'on badge-gold' : 'off badge-neutral'}`}>
                            {rewardUnlocked ? '✓ ' : '🔒 '}
                            {reward}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        <section className="premium-card">
          <h3>Autogoverno (Tier Premium)</h3>
          <p>{tierPremiumLocked ? 'Desbloqueie benefícios premium com upgrade da mentoria.' : 'Você já possui acesso premium ativo.'}</p>
          {tierPremiumLocked ? (
            <a href={UPGRADE_LINK} target="_blank" rel="noreferrer" className="btn-upgrade">
              Fazer upgrade
            </a>
          ) : (
            <span className="premium-ok">👑 Premium ativo</span>
          )}
        </section>

        <section className="history">
          <h3>Últimas transações</h3>
          {latestTransactions.length === 0 ? (
            <p className="empty">Sem transações de coins ainda.</p>
          ) : (
            <ul>
              {latestTransactions.map((tx) => (
                <li key={tx.id}>
                  <span className="amount">+{Number(tx.amount || 0)} 🪙</span>
                  <span className="desc">{tx.description || tx.action_type}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />

      <style jsx>{`
        .jornada-screen {
          min-height: 100vh;
          background: var(--bg-deep);
          color: var(--text);
        }

        .jornada-shell {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px 14px calc(116px + env(safe-area-inset-bottom));
        }

        .jornada-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          line-height: 1.1;
        }

        .jornada-header p {
          margin: 6px 0 0;
          color: var(--text-2);
          font-size: 14px;
        }

        .btn-refresh,
        .btn-upgrade {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          padding: 9px 14px;
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition);
        }

        .coins-strip {
          border: 1px solid rgba(255, 213, 79, 0.22);
          border-radius: var(--radius-lg);
          background: var(--gold-dim);
          padding: 13px;
          margin-bottom: 14px;
        }

        .strip-main {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .strip-balance {
          color: var(--text-2);
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .strip-total {
          color: var(--gold);
          font-size: 24px;
          font-family: var(--font-mono);
        }

        .strip-phase {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          color: var(--text-2);
        }

        .strip-phase small {
          color: var(--text-3);
          font-size: 10px;
          font-family: var(--font-mono);
        }

        .feedback {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          padding: 10px;
          margin-bottom: 12px;
          background: var(--bg-surface);
        }

        .feedback.error {
          border-color: rgba(239, 68, 68, 0.45);
          color: #e45a5a;
        }

        .timeline {
          display: grid;
          gap: 12px;
          margin-bottom: 14px;
        }

        .fase-card {
          position: relative;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          padding: 12px;
          display: flex;
          gap: 10px;
        }

        .fase-card:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 29px;
          bottom: -14px;
          width: 2px;
          height: 14px;
          background: var(--border-2);
        }

        .fase-card.done:not(:last-child)::after {
          background: var(--green);
        }

        .fase-card.current {
          border-color: rgba(255, 213, 79, 0.6);
          box-shadow: 0 0 0 1px rgba(255, 213, 79, 0.28);
        }

        .fase-card.done {
          border-color: var(--green-mid);
        }

        .fase-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-elevated);
          border: 1px solid var(--border-2);
          font-weight: 700;
          flex-shrink: 0;
          filter: grayscale(0);
        }

        .fase-icon.locked {
          filter: grayscale(1);
        }

        .fase-icon.done {
          background: var(--green);
          border-color: var(--green);
          color: #05230f;
        }

        .fase-icon.current {
          background: var(--gold-dim);
          border-color: var(--gold);
          animation: pulseCurrent 1.5s ease-in-out infinite;
        }

        @keyframes pulseCurrent {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(255, 213, 79, 0.25);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(255, 213, 79, 0);
          }
        }

        .fase-body h2 {
          margin: 0;
          font-size: 18px;
          font-family: var(--font-display);
          font-weight: 700;
        }

        .fase-body p {
          margin: 4px 0 8px;
          color: var(--text-2);
        }

        .progress-wrap {
          margin-bottom: 8px;
        }

        .progress-track {
          height: 8px;
        }

        .progress-fill {
          background: linear-gradient(90deg, var(--gold), var(--green));
        }

        .progress-wrap small {
          display: inline-block;
          margin-top: 5px;
          color: var(--text-3);
          font-size: 10px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .chip {
          padding: 5px 9px;
          font-size: 12px;
        }

        .chip.on {
          color: var(--gold);
        }

        .chip.off {
          color: var(--text-2);
        }

        .premium-card,
        .history {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          padding: 12px;
          margin-bottom: 12px;
        }

        .premium-card h3,
        .history h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-family: var(--font-display);
          font-weight: 700;
        }

        .premium-card p {
          margin: 0 0 10px;
          color: var(--text-2);
        }

        .btn-upgrade {
          display: inline-block;
          border-color: rgba(255, 213, 79, 0.45);
          background: var(--gold-dim);
          color: var(--gold);
        }

        .premium-ok {
          color: var(--green);
          font-weight: 700;
        }

        .history ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .history li {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          padding: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 14px;
          background: var(--bg-elevated);
        }

        .amount {
          color: var(--green);
          font-weight: 700;
          font-family: var(--font-mono);
          white-space: nowrap;
        }

        .desc {
          color: var(--text-2);
          text-align: right;
        }

        .empty {
          color: var(--text-2);
          margin: 0;
        }

        @media (max-width: 768px) {
          .jornada-header {
            flex-direction: column;
          }

          h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </div>
  );
}
