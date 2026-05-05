'use client';

import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';

export default function MAVFAppShell({ children, activeTab = 'mavf' }) {
  return (
    <div className="mavf-app-container">
      <AppHeader />

      <main className="mavf-app-content">{children}</main>

      <BottomNav activeTab={activeTab} />

      <style jsx>{`
        .mavf-app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
          color: #ffffff;
          color-scheme: dark;
        }

        .mavf-app-content {
          flex: 1;
          width: 100%;
          padding: 18px 14px calc(90px + env(safe-area-inset-bottom));
          background: #0a0a0a;
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
          color-scheme: dark;
        }
      `}</style>
    </div>
  );
}
