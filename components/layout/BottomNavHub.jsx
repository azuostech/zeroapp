'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavHub() {
  const pathname = usePathname() || '';

  const tabs = [
    { id: 'inicio', icon: '🏠', label: 'Início', href: '/app' },
    { id: 'mavf', icon: '🧭', label: 'MAVF', href: '/mavf' },
    { id: 'voce', icon: '👤', label: 'Você', href: '/jornada' }
  ];

  return (
    <>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {tabs.map((tab) => {
          const isActive = Boolean(tab.href && (pathname === tab.href || pathname.startsWith(`${tab.href}/`)));
          const classes = `nav-tab${isActive ? ' active' : ''}`;

          if (tab.action) {
            return (
              <button key={tab.id} type="button" className={classes} onClick={tab.action}>
                <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
                <span className="nav-tab-label">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link key={tab.id} href={tab.href} className={classes}>
              <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{styles}</style>
    </>
  );
}

const styles = `
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: var(--bottom-nav-height);
    background: rgba(10, 10, 10, 0.95);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    padding: 0 8px env(safe-area-inset-bottom, 0px);
    z-index: 100;
  }

  .nav-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: 12px;
    min-height: 44px;
    transition: all 0.2s;
    text-decoration: none;
    border: none;
    background: none;
    cursor: pointer;
    padding: 4px 0;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-tab-icon {
    font-size: 20px;
    line-height: 1;
  }

  .nav-tab-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .nav-tab.active {
    background: var(--green-dim);
  }

  .nav-tab.active .nav-tab-label {
    color: var(--green);
  }

  .nav-tab:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: -2px;
  }
`;
