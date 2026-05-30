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

function toTitleCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const lower = text.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

function getFirstName(profile) {
  const fullName = String(profile?.full_name || '').trim();
  if (fullName) {
    const [first] = fullName.split(/\s+/);
    return toTitleCase(first);
  }

  const email = String(profile?.email || '').trim();
  if (email.includes('@')) {
    const [local] = email.split('@');
    return toTitleCase(local.replace(/[._-]+/g, ' ')).split(' ')[0] || 'Você';
  }

  return 'Você';
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
  const shortName = displayName.split(' ')[0] || displayName;
  const firstName = useMemo(() => getFirstName(profile), [profile]);
  const profileTier = String(profile?.tier || 'DESPERTAR').toUpperCase();
  const tierClass = `tier-${profileTier.toLowerCase()}`;
  const logoSrc = theme === 'light' ? '/logo-zeroapp-light.png' : '/logo-zeroapp-dark.png';

  return (
    <header className="app-header">
      <div className="header-content">
        <Link href="/app" className="header-logo" aria-label="Ir para início do app">
          <Image src={logoSrc} alt="Logo ZeroApp" width={36} height={36} priority className="header-logo-img" />
          <span className="header-logo-text">{firstName}</span>
        </Link>

        <div className="header-actions">
          <Link href="/jornada" className="jornada-shortcut-link" aria-label="Abrir jornada (tier)">
            <TierDisplay size="sm" showName={false} />
          </Link>
          <Link href="/jornada" className="jornada-shortcut-link" aria-label="Abrir jornada (coins)">
            <CoinsDisplay size="sm" className="header-coins" clickable={false} />
          </Link>

          <span className="user-name" title={displayName}>
            {shortName}
          </span>

          <div className={`user-avatar avatar ${tierClass}`} title={displayName} aria-label={`Avatar de ${displayName}`}>
            {avatarInitial}
          </div>
        </div>
      </div>

      {faseProgress ? (
        <div className="fase-progress-mobile">
          <span className="fase-progress-emoji">{faseProgress.emoji}</span>
          <div className="fase-progress-track progress-track">
            <div className="fase-progress-fill progress-fill" style={{ width: `${Math.max(0, Math.min(100, faseProgress.progressoPct))}%` }} />
          </div>
          <span className="fase-progress-label">
            {faseProgress.coinsParaProxima > 0 && faseProgress.nextName
              ? `${faseProgress.coinsParaProxima} 🪙 para ${faseProgress.nextName}`
              : 'Fase máxima'}
          </span>
        </div>
      ) : null}

      <style jsx>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 140;
          background: color-mix(in srgb, var(--bg-deep) 92%, transparent);
          border-bottom: 1px solid var(--border-2);
          box-shadow: var(--shadow-sm);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: var(--green);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :global(.header-coins) {
          flex-shrink: 0;
        }

        :global(.jornada-shortcut-link) {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          border-radius: 999px;
        }

        :global(.jornada-shortcut-link:focus-visible) {
          outline: 2px solid var(--green);
          outline-offset: 2px;
        }

        .user-name {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 14px;
          color: var(--text);
          max-width: 92px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--bg-surface), var(--bg-elevated));
          border: 2px solid var(--green-mid);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          text-transform: uppercase;
        }

        .tier-despertar {
          border-color: var(--green-mid);
        }

        .tier-movimento {
          border-color: rgba(255, 215, 0, 0.6);
        }

        .tier-aceleracao {
          border-color: rgba(100, 181, 255, 0.7);
        }

        .tier-autogoverno {
          border-color: rgba(179, 157, 219, 0.72);
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
          }

          .fase-progress-fill {
            background: linear-gradient(90deg, var(--gold), var(--green));
          }

          .fase-progress-label {
            font-size: 10px;
            color: var(--text-3);
            white-space: nowrap;
          }

          .user-name {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
