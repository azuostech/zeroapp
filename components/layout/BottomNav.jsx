'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { id: 'inicio', href: '/app', icon: '🏠', label: 'Início' },
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
        :global(html[data-theme='dark']) {
          --bottom-nav-bg: #1d1d1d;
          --bottom-nav-border: #2f2f2f;
          --bottom-nav-item: #909090;
          --bottom-nav-item-active: #00c853;
          --bottom-nav-active-bg: rgba(0, 200, 83, 0.12);
        }

        :global(html[data-theme='light']) {
          --bottom-nav-bg: rgba(255, 255, 255, 0.96);
          --bottom-nav-border: #d9dde1;
          --bottom-nav-item: #5c6470;
          --bottom-nav-item-active: #068b44;
          --bottom-nav-active-bg: rgba(6, 139, 68, 0.11);
        }

        .bottom-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 150;
          display: flex;
          justify-content: space-around;
          gap: 6px;
          background: var(--bottom-nav-bg, #1d1d1d);
          border-top: 1px solid var(--bottom-nav-border, #2f2f2f);
          padding: 8px 10px max(8px, env(safe-area-inset-bottom));
          backdrop-filter: blur(10px);
        }

        :global(.bottom-nav-tab) {
          flex: 1;
          min-width: 0;
          max-width: 120px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--bottom-nav-item, #909090);
          text-decoration: none;
          padding: 8px 4px;
          transition: all 0.2s ease;
        }

        :global(.bottom-nav-tab.active) {
          color: var(--bottom-nav-item-active, #00c853);
          background: var(--bottom-nav-active-bg, rgba(0, 200, 83, 0.12));
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
