'use client';

import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';

export default function MAVFAppShell({ children, activeTab = 'mavf', hideNavigation = false }) {
  return (
    <div className="mavf-app-container">
      {hideNavigation ? null : <AppHeader />}

      <main className="mavf-app-content">{children}</main>

      {hideNavigation ? null : <BottomNav activeTab={activeTab} />}

      <style jsx>{`
        .mavf-app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          color: var(--text);
          color-scheme: light;
        }

        .mavf-app-content {
          flex: 1;
          width: 100%;
          padding: 18px 14px calc(120px + env(safe-area-inset-bottom));
          background: var(--bg);
        }

        @media (min-width: 768px) {
          .mavf-app-content {
            padding: 24px 20px calc(96px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <style jsx global>{`
        .mavf-app-container,
        .mavf-app-container * {
          color-scheme: light;
        }
      `}</style>
    </div>
  );
}
