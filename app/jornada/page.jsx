'use client';

import { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
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
            <h1>Minha Jornada 🎯</h1>
            <p>Desbloqueie recompensas conforme avança</p>
          </div>
          <button type="button" className="btn-refresh" onClick={refresh}>
            Atualizar
          </button>
        </header>

        <section className="coins-strip">
          <div className="strip-main">
            <span>🪙 {formatCoins(coinsAtual)} saldo atual</span>
            <strong>{formatCoins(coinsTotal)} ZeroCoins totais</strong>
          </div>
          <div className="strip-phase">
            <span>
              Fase: {faseAtual?.emoji} {faseAtual?.nome || 'Bombeiro'}
            </span>
            {proximaFase ? <small>{coinsParaProxima} 🪙 para {proximaFase.nome}</small> : <small>Fase máxima alcançada</small>}
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

              return (
                <article key={fase.id} className={`fase-card ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}>
                  <div className="fase-icon">{isDone ? '✓' : fase.emoji}</div>
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
                          <span key={reward} className={`chip ${rewardUnlocked ? 'on' : 'off'}`}>
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

      <BottomNav activeTab="jornada" />

      <style jsx>{`
        :global(html[data-theme='dark']) {
          --j-bg: #0b0d0f;
          --j-text: #f3f3f3;
          --j-muted: #a0a5aa;
          --j-surface: #141619;
          --j-surface-2: #171a1e;
          --j-border: #2f363d;
          --j-positive: #00c853;
          --j-positive-soft: rgba(0, 200, 83, 0.12);
          --j-chip-off: rgba(255, 255, 255, 0.04);
        }

        :global(html[data-theme='light']) {
          --j-bg: #f4f6f8;
          --j-text: #1a1e23;
          --j-muted: #636e78;
          --j-surface: #ffffff;
          --j-surface-2: #f8fafb;
          --j-border: #d5dde4;
          --j-positive: #0b8a46;
          --j-positive-soft: rgba(11, 138, 70, 0.1);
          --j-chip-off: rgba(25, 36, 48, 0.05);
        }

        .jornada-screen {
          min-height: 100vh;
          background: var(--j-bg, #0b0d0f);
          color: var(--j-text, #f3f3f3);
        }

        .jornada-shell {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px 14px calc(98px + env(safe-area-inset-bottom));
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
          font-size: 30px;
          line-height: 1.1;
        }

        .jornada-header p {
          margin: 6px 0 0;
          color: var(--j-muted, #a0a5aa);
        }

        .btn-refresh,
        .btn-upgrade {
          border: 1px solid var(--j-border, #2f363d);
          border-radius: 12px;
          background: var(--j-surface-2, #171a1e);
          color: var(--j-text, #f3f3f3);
          padding: 9px 14px;
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
        }

        .coins-strip {
          border: 1px solid var(--j-border, #2f363d);
          border-radius: 16px;
          background: var(--j-surface, #141619);
          padding: 13px;
          margin-bottom: 14px;
        }

        .strip-main {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }

        .strip-main span {
          color: color-mix(in srgb, var(--j-positive, #00c853) 75%, var(--j-text, #f3f3f3));
          font-weight: 700;
        }

        .strip-main strong {
          color: var(--j-positive, #00c853);
          font-size: 20px;
        }

        .strip-phase {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          color: var(--j-muted, #a0a5aa);
        }

        .feedback {
          border: 1px solid var(--j-border, #2f363d);
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 12px;
          background: var(--j-surface-2, #171a1e);
        }

        .feedback.error {
          border-color: rgba(239, 68, 68, 0.45);
          color: #e45a5a;
        }

        .timeline {
          display: grid;
          gap: 10px;
          margin-bottom: 14px;
        }

        .fase-card {
          border: 1px solid var(--j-border, #2f363d);
          border-radius: 16px;
          background: var(--j-surface, #141619);
          padding: 12px;
          display: flex;
          gap: 10px;
        }

        .fase-card.current {
          border-color: rgba(255, 215, 0, 0.55);
          box-shadow: 0 0 0 1px rgba(255, 215, 0, 0.24);
        }

        .fase-card.done {
          border-color: rgba(0, 200, 83, 0.45);
        }

        .fase-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--j-surface-2, #171a1e);
          font-weight: 700;
          flex-shrink: 0;
        }

        .fase-card.done .fase-icon {
          background: var(--j-positive, #00c853);
          color: #05230f;
        }

        .fase-body h2 {
          margin: 0;
          font-size: 18px;
        }

        .fase-body p {
          margin: 4px 0 8px;
          color: var(--j-muted, #a0a5aa);
        }

        .progress-wrap {
          margin-bottom: 8px;
        }

        .progress-track {
          height: 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--j-muted, #a0a5aa) 22%, transparent);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, var(--j-positive, #00c853));
        }

        .progress-wrap small {
          display: inline-block;
          margin-top: 5px;
          color: var(--j-muted, #a0a5aa);
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .chip {
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          border: 1px solid var(--j-border, #2f363d);
        }

        .chip.on {
          background: var(--j-positive-soft, rgba(0, 200, 83, 0.12));
          border-color: color-mix(in srgb, var(--j-positive, #00c853) 52%, transparent);
          color: color-mix(in srgb, var(--j-positive, #00c853) 82%, var(--j-text, #f3f3f3));
        }

        .chip.off {
          color: var(--j-muted, #a0a5aa);
          background: var(--j-chip-off, rgba(255, 255, 255, 0.04));
        }

        .premium-card,
        .history {
          border: 1px solid var(--j-border, #2f363d);
          border-radius: 14px;
          background: var(--j-surface, #141619);
          padding: 12px;
          margin-bottom: 12px;
        }

        .premium-card h3,
        .history h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .premium-card p {
          margin: 0 0 10px;
          color: var(--j-muted, #a0a5aa);
        }

        .btn-upgrade {
          display: inline-block;
          border-color: rgba(255, 215, 0, 0.5);
          background: rgba(255, 215, 0, 0.12);
          color: #9c7f00;
        }

        :global(html[data-theme='dark']) .btn-upgrade {
          color: #ffd700;
        }

        .premium-ok {
          color: var(--j-positive, #00c853);
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
          border: 1px solid var(--j-border, #2f363d);
          border-radius: 10px;
          padding: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 14px;
          background: var(--j-surface-2, #171a1e);
        }

        .amount {
          color: var(--j-positive, #00c853);
          font-weight: 700;
          white-space: nowrap;
        }

        .desc {
          color: var(--j-muted, #a0a5aa);
          text-align: right;
        }

        .empty {
          color: var(--j-muted, #a0a5aa);
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
