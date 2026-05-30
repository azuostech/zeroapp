'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { id: 'inicio', href: '/app', icon: '🏠', label: 'Início' },
  { id: 'jornada', href: '/mavf', icon: '🌱', label: 'Minha Jornada' },
  { id: 'conquistas', href: '/jornada', icon: '🏆', label: 'Conquistas' }
];

function getAutoActiveTab(pathname) {
  if (pathname === '/app' || pathname === '/') return 'inicio';
  if (pathname.startsWith('/mavf')) return 'jornada';
  if (pathname.startsWith('/jornada')) return 'conquistas';
  return '';
}

export default function BottomNav({ activeTab = '' }) {
  const pathname = usePathname();
  const normalizedActiveTab = activeTab === 'mavf' ? 'jornada' : activeTab === 'perfil' || activeTab === 'voce' ? 'conquistas' : activeTab;
  const current = normalizedActiveTab || getAutoActiveTab(pathname || '');

  return (
    <nav className="bottom-nav" aria-label="Navegação principal do app">
      {TABS.map((tab) => {
        const isActive = tab.id === current;
        return (
          <Link key={tab.id} href={tab.href} className={`nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </Link>
        );
      })}

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 150;
          display: flex;
          justify-content: space-around;
          gap: 6px;
          background: color-mix(in srgb, var(--bg-deep) 92%, transparent);
          border-top: 1px solid var(--border-2);
          padding: 8px 10px calc(24px + env(safe-area-inset-bottom));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        :global(.nav-item) {
          flex: 1;
          min-width: 0;
          max-width: 120px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--text-2);
          text-decoration: none;
          padding: 8px 4px;
          transition: var(--transition);
        }

        :global(.nav-item.active) {
          color: var(--green);
          background: var(--green-dim);
        }

        .nav-icon {
          font-size: 20px;
          line-height: 1;
        }

        .nav-label {
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
