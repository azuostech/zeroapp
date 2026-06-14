'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavHub() {
  const pathname = usePathname() || '';

  const tabs = [
    { id: 'inicio', icon: '🏠', label: 'Início', href: '/app' },
    { id: 'jornada', icon: '🌱', label: 'Minha Jornada', href: '/mavf' },
    { id: 'conquistas', icon: '🏆', label: 'Conquistas', href: '/jornada' }
  ];

  const isActive = (href) => {
    if (href === '/app') return pathname === '/app' || pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const classes = `nav-tab${active ? ' active' : ''}`;

          return (
            <Link key={tab.id} href={tab.href} className={classes} aria-current={active ? 'page' : undefined}>
              <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
              {active ? <span className="nav-tab-dot" aria-hidden="true" /> : null}
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
    background: color-mix(in srgb, var(--bg-nav) 94%, transparent);
    border-top: 1px solid var(--border);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
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
    position: relative;
  }

  .nav-tab-icon {
    font-size: 20px;
    line-height: 1;
  }

  .nav-tab-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    line-height: 1.2;
    text-align: center;
  }

  .nav-tab.active {
    background: var(--green-dim);
  }

  .nav-tab.active .nav-tab-label {
    color: var(--green-dark);
  }

  .nav-tab:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: -2px;
  }

  .nav-tab-dot {
    position: absolute;
    bottom: 3px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--green);
  }
`;
