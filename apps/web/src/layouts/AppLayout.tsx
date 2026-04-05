import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/ui/AppHeader';
import { TabsBar } from '../components/ui/TabsBar';
import '../styles/app.css';

export function AppLayout() {
  return (
    <div className="appShell">
      <AppHeader />
      <TabsBar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
