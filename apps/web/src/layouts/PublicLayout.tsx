import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="layout-shell">
      <Outlet />
    </div>
  );
}
