import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/app/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminCodesPage } from './pages/admin/AdminCodesPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { DashboardPage } from './pages/app/DashboardPage';
import { DividasPage } from './pages/app/DividasPage';
import { EntradasPage } from './pages/app/EntradasPage';
import { InvestimentosPage } from './pages/app/InvestimentosPage';
import { JornadaPage } from './pages/app/JornadaPage';
import { MetasPage } from './pages/app/MetasPage';
import { PerfilPage } from './pages/app/PerfilPage';
import { RankingPage } from './pages/app/RankingPage';
import { ResgatarPage } from './pages/app/ResgatarPage';
import { SaidasPage } from './pages/app/SaidasPage';
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/resgatar" element={<Navigate to="/app/resgatar" replace />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/entradas" element={<EntradasPage />} />
          <Route path="/app/saidas" element={<SaidasPage />} />
          <Route path="/app/dividas" element={<DividasPage />} />
          <Route path="/app/investimentos" element={<InvestimentosPage />} />
          <Route path="/app/metas" element={<MetasPage />} />
          <Route path="/app/jornada" element={<JornadaPage />} />
          <Route path="/app/ranking" element={<RankingPage />} />
          <Route path="/app/perfil" element={<PerfilPage />} />
          <Route path="/app/resgatar" element={<ResgatarPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          <Route path="/admin/usuarios/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/codigos" element={<AdminCodesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
