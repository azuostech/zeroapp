'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { id: 'inicio', href: '/app', icon: '🏠', label: 'Início' },
  { id: 'blocos', href: '/app#blocos', icon: '💰', label: 'Blocos' },
  { id: 'mavf', href: '/mavf', icon: '📊', label: 'MAVF' },
  { id: 'perfil', href: '/app#perfil', icon: '👤', label: 'Perfil' }
];

function getAutoActiveTab(pathname) {
  if (pathname.startsWith('/mavf')) return 'mavf';
  if (pathname.startsWith('/app')) return 'inicio';
  return '';
}

export default function BottomNav({ activeTab = '' }) {
  const pathname = usePathname();
  const current = activeTab || getAutoActiveTab(pathname || '');

  return (
    <nav className="bottom-nav" aria-label="Navegação principal do app">
      {TABS.map((tab) => {
        const isActive = tab.id === current;
        return (
          <Link key={tab.id} href={tab.href} className={`bottom-nav-tab ${isActive ? 'active' : ''}`}>
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
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
          background: #1d1d1d;
          border-top: 1px solid #2f2f2f;
          padding: 8px 10px max(8px, env(safe-area-inset-bottom));
        }

        .bottom-nav-tab {
          flex: 1;
          min-width: 64px;
          max-width: 120px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #909090;
          text-decoration: none;
          padding: 8px 4px;
          transition: all 0.2s ease;
        }

        .bottom-nav-tab.active {
          color: #00c853;
          background: rgba(0, 200, 83, 0.12);
        }

        .tab-icon {
          font-size: 19px;
          line-height: 1;
        }

        .tab-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1px;
          line-height: 1;
        }
      `}</style>
    </nav>
  );
}
