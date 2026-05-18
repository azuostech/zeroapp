'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { CoinsDisplay } from '@/components/gamification/CoinsDisplay';
import { TierDisplay } from '@/components/gamification/TierDisplay';

const THEME_KEY = 'zeroapp-theme';

function getAvatarInitial(profile) {
  const base = profile?.full_name || profile?.email || '';
  return base.trim().charAt(0).toUpperCase() || 'U';
}

export default function AppHeader() {
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState('light');
  const [faseProgress, setFaseProgress] = useState(null);

  useEffect(() => {
    const readTheme = () => {
      try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
      } catch (_) {
        // no-op
      }

      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    };

    const syncTheme = () => {
      const nextTheme = readTheme();
      setTheme((prevTheme) => (prevTheme === nextTheme ? prevTheme : nextTheme));

      // Evita loop com MutationObserver ao reescrever o mesmo valor.
      if (document.documentElement.getAttribute('data-theme') !== nextTheme) {
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('storage', syncTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadHeaderData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch('/api/profile/me', { cache: 'no-store' }),
          fetch('/api/coins/history?limit=1', { cache: 'no-store' })
        ]);

        if (profileRes.ok) {
          const profilePayload = await profileRes.json().catch(() => ({}));
          if (active) setProfile(profilePayload?.profile || null);
        }

        if (historyRes.ok) {
          const historyPayload = await historyRes.json().catch(() => ({}));
          if (active) {
            const fase = historyPayload?.fase_atual;
            const proxima = historyPayload?.proxima_fase;
            if (fase) {
              setFaseProgress({
                emoji: fase.emoji || '🔥',
                progressoPct: Number(fase.progresso_pct || 0),
                coinsParaProxima: Number(fase.coins_para_proxima || 0),
                nextName: proxima?.nome || null
              });
            }
          }
        }
      } catch (_) {
        // Silent fallback: keep header functional even if profile/coins fail.
      }
    };

    loadHeaderData();

    const handleCoinsUpdated = () => {
      loadHeaderData();
    };
    window.addEventListener('zero:coins-updated', handleCoinsUpdated);

    return () => {
      active = false;
      window.removeEventListener('zero:coins-updated', handleCoinsUpdated);
    };
  }, []);

  const avatarInitial = useMemo(() => getAvatarInitial(profile), [profile]);
  const displayName = profile?.full_name || profile?.email || 'Usuário';
  const logoSrc = theme === 'light' ? '/logo-zeroapp-light.png' : '/logo-zeroapp-dark.png';

  return (
    <header className="app-header">
      <div className="header-content">
        <Link href="/app" className="header-logo" aria-label="Ir para início do app">
          <Image src={logoSrc} alt="Logo ZeroApp" width={36} height={36} priority className="header-logo-img" />
          <span className="header-logo-text">ZEROAPP</span>
        </Link>

        <div className="header-actions">
          <TierDisplay size="sm" showName={false} />
          <Link href="/jornada" className="coins-link" aria-label="Ver jornada">
            <CoinsDisplay size="sm" className="header-coins" />
            <span className="coins-link-hint">Ver jornada ›</span>
          </Link>

          <div className="user-avatar" title={displayName} aria-label={`Avatar de ${displayName}`}>
            {avatarInitial}
          </div>
        </div>
      </div>

      {faseProgress ? (
        <div className="fase-progress-mobile">
          <span className="fase-progress-emoji">{faseProgress.emoji}</span>
          <div className="fase-progress-track">
            <div className="fase-progress-fill" style={{ width: `${Math.max(0, Math.min(100, faseProgress.progressoPct))}%` }} />
          </div>
          <span className="fase-progress-label">
            {faseProgress.coinsParaProxima > 0 && faseProgress.nextName
              ? `${faseProgress.coinsParaProxima} 🪙 para ${faseProgress.nextName}`
              : 'Fase máxima'}
          </span>
        </div>
      ) : null}

      <style jsx>{`
        :global(html[data-theme='dark']) {
          --app-header-bg: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
          --app-header-border: #2d2d2d;
          --app-header-shadow: 0 8px 30px rgba(0, 200, 83, 0.08);
          --app-header-logo: #00c853;
          --app-header-avatar-text: #07130c;
        }

        :global(html[data-theme='light']) {
          --app-header-bg: linear-gradient(135deg, #f8fafb 0%, #eef2f4 100%);
          --app-header-border: #d5dde2;
          --app-header-shadow: 0 8px 26px rgba(5, 18, 35, 0.08);
          --app-header-logo: #0b8a46;
          --app-header-avatar-text: #ffffff;
        }

        .app-header {
          position: sticky;
          top: 0;
          z-index: 140;
          background: var(--app-header-bg, linear-gradient(135deg, #121212 0%, #1a1a1a 100%));
          border-bottom: 1px solid var(--app-header-border, #2d2d2d);
          box-shadow: var(--app-header-shadow, 0 8px 30px rgba(0, 200, 83, 0.08));
          backdrop-filter: blur(8px);
        }

        .header-content {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        :global(.header-logo) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        :global(.header-logo-img) {
          border-radius: 10px;
        }

        .header-logo-text {
          font-family: 'Space Mono', monospace;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 2px;
          color: var(--app-header-logo, #00c853);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        :global(.header-coins) {
          flex-shrink: 0;
        }

        :global(.coins-link) {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          text-decoration: none;
        }

        .coins-link-hint {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2px;
          color: #95a29a;
          line-height: 1;
        }

        :global(.coins-link:hover .coins-link-hint),
        :global(.coins-link:focus-visible .coins-link-hint) {
          color: var(--app-header-logo, #00c853);
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00c853, #ffd700);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--app-header-avatar-text, #07130c);
          text-transform: uppercase;
        }

        .fase-progress-mobile {
          display: none;
        }

        @media (max-width: 768px) {
          .fase-progress-mobile {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 16px 10px;
          }

          .fase-progress-emoji {
            font-size: 14px;
            line-height: 1;
          }

          .fase-progress-track {
            flex: 1;
            height: 6px;
            border-radius: 999px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.12);
          }

          .fase-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ffd700, #00c853);
          }

          .fase-progress-label {
            font-size: 10px;
            color: #a8b1aa;
            white-space: nowrap;
          }
        }
      `}</style>
    </header>
  );
}
