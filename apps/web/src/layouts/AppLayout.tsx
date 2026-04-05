import { Link, NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import '../styles/app.css';

const appLinks = [
  ['/app/dashboard', 'Dashboard'],
  ['/app/entradas', 'Entradas'],
  ['/app/saidas', 'Saídas'],
  ['/app/dividas', 'Dívidas'],
  ['/app/investimentos', 'Investimentos'],
  ['/app/metas', 'Metas'],
  ['/app/jornada', 'Jornada'],
  ['/app/ranking', 'Ranking'],
  ['/app/perfil', 'Perfil'],
  ['/app/resgatar', 'Resgatar']
] as const;

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-grid">
      <aside className="sidebar">
        <Link to="/app/dashboard"><h2>ZERO</h2></Link>
        <p style={{ color: '#aaa' }}>{user?.name}</p>
        <nav style={{ display: 'grid', gap: 8 }}>
          {appLinks.map(([to, label]) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
          {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div style={{ marginTop: 16 }}>
          <Button variant="danger" onClick={logout}>Sair</Button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
