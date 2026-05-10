'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'zeroapp-theme';

function getAvatarInitial(profile) {
  const base = profile?.full_name || profile?.email || '';
  return base.trim().charAt(0).toUpperCase() || 'U';
}

export default function AppHeader() {
  const [profile, setProfile] = useState(null);
  const [coins, setCoins] = useState(0);
  const [theme, setTheme] = useState('light');

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

    const syncTheme = () => setTheme(readTheme());
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
        const [profileRes, coinsRes] = await Promise.all([
          fetch('/api/profile/me', { cache: 'no-store' }),
          fetch('/api/coins/balance', { cache: 'no-store' })
        ]);

        if (profileRes.ok) {
          const profilePayload = await profileRes.json();
          if (active) {
            setProfile(profilePayload?.profile || null);
          }
        }

        if (coinsRes.ok) {
          const coinsPayload = await coinsRes.json();
          if (active) {
            setCoins(Number(coinsPayload?.data?.coins || 0));
          }
        }
      } catch (_) {
        // Silent fallback: keep header functional even if profile/coins fail.
      }
    };

    loadHeaderData();
    return () => {
      active = false;
    };
  }, []);

  const avatarInitial = useMemo(() => getAvatarInitial(profile), [profile]);
  const displayName = profile?.full_name || profile?.email || 'Usuário';
  const formattedCoins = useMemo(() => new Intl.NumberFormat('pt-BR').format(coins), [coins]);
  const logoSrc = theme === 'light' ? '/logo-zeroapp-light.png' : '/logo-zeroapp-dark.png';

  return (
    <header className="app-header">
      <div className="header-content">
        <Link href="/app" className="header-logo" aria-label="Ir para início do app">
          <Image src={logoSrc} alt="Logo ZeroApp" width={36} height={36} priority className="header-logo-img" />
          <span className="header-logo-text">ZEROAPP</span>
        </Link>

        <div className="header-actions">
          <div className="coins-display" title="Saldo atual de coins">
            🪙 {formattedCoins}
          </div>

          <div className="user-avatar" title={displayName} aria-label={`Avatar de ${displayName}`}>
            {avatarInitial}
          </div>
        </div>
      </div>

      <style jsx>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 140;
          background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
          border-bottom: 1px solid #2d2d2d;
          box-shadow: 0 8px 30px rgba(0, 200, 83, 0.08);
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

        .header-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .header-logo-img {
          border-radius: 10px;
        }

        .header-logo-text {
          font-family: 'Space Mono', monospace;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #00c853;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .coins-display {
          font-size: 13px;
          color: #b2b2b2;
          font-weight: 600;
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
          color: #07130c;
          text-transform: uppercase;
        }
      `}</style>
    </header>
  );
}
