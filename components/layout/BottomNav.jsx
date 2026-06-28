'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { hasStudentAccess } from '@/src/modules/profile/domain/access';

const STUDENT_TABS = [
  { id: 'inicio', href: '/app', icon: '🏠', label: 'Início' },
  { id: 'jornada', href: '/mavf', icon: '🌱', label: 'Minha Jornada' },
  { id: 'conquistas', href: '/jornada', icon: '🏆', label: 'Conquistas' }
];

const BASIC_TABS = [
  { id: 'inicio', href: '/app', icon: '🏠', label: 'Início' },
  { id: 'financas', href: '/financas', icon: '💰', label: 'Finanças' },
  { id: 'educacao', href: '/conteudo', icon: '📚', label: 'Educação' }
];

function getStudentAutoActiveTab(pathname) {
  if (pathname === '/app' || pathname === '/') return 'inicio';
  if (pathname.startsWith('/mavf')) return 'jornada';
  if (pathname.startsWith('/jornada')) return 'conquistas';
  return '';
}

function getBasicAutoActiveTab(pathname) {
  if (pathname === '/app' || pathname === '/') return 'inicio';
  if (pathname.startsWith('/financas')) return 'financas';
  if (pathname.startsWith('/conteudo')) return 'educacao';
  return '';
}

export default function BottomNav({ activeTab = '' }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile/me', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok) {
          setProfile(payload?.profile || null);
        }
      } catch (_) {
        if (active) setProfile(null);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const canUseStudentAreas = hasStudentAccess(profile);
  const tabs = useMemo(() => (canUseStudentAreas ? STUDENT_TABS : BASIC_TABS), [canUseStudentAreas]);
  const normalizedActiveTab = activeTab === 'mavf' ? 'jornada' : activeTab === 'perfil' || activeTab === 'voce' ? 'conquistas' : activeTab;
  const autoActiveTab = canUseStudentAreas ? getStudentAutoActiveTab(pathname || '') : getBasicAutoActiveTab(pathname || '');
  const requestedActiveTab = tabs.some((tab) => tab.id === normalizedActiveTab) ? normalizedActiveTab : '';
  const current = autoActiveTab || requestedActiveTab || 'inicio';

  return (
    <nav className="zero-bottom-nav" aria-label="Navegação principal do app">
      {tabs.map((tab) => {
        const isActive = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`zero-bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="zero-bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
            <span className="zero-bottom-nav-label">{tab.label}</span>
          </Link>
        );
      })}

      <style jsx global>{`
        .zero-bottom-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 180;
          display: flex;
          justify-content: space-around;
          gap: 6px;
          background: color-mix(in srgb, var(--bg-nav) 94%, transparent);
          border-top: 1px solid var(--border);
          box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
          min-height: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px));
          padding: 8px max(10px, env(safe-area-inset-left, 0px)) calc(8px + env(safe-area-inset-bottom, 0px))
            max(10px, env(safe-area-inset-right, 0px));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .zero-bottom-nav-item {
          flex: 1;
          min-width: 0;
          max-width: 120px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--text3);
          text-decoration: none;
          padding: 8px 4px;
          transition: var(--transition);
        }

        .zero-bottom-nav-item.active {
          color: var(--green-dark);
          background: var(--green-dim);
        }

        .zero-bottom-nav-icon {
          font-size: 20px;
          line-height: 1;
        }

        .zero-bottom-nav-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          line-height: 1;
        }
      `}</style>
    </nav>
  );
}
