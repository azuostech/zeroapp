import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs(Routes, { children: [_jsxs(Route, { element: _jsx(PublicLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/cadastro", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/resgatar", element: _jsx(Navigate, { to: "/app/resgatar", replace: true }) })] }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/app/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/app/entradas", element: _jsx(EntradasPage, {}) }), _jsx(Route, { path: "/app/saidas", element: _jsx(SaidasPage, {}) }), _jsx(Route, { path: "/app/dividas", element: _jsx(DividasPage, {}) }), _jsx(Route, { path: "/app/investimentos", element: _jsx(InvestimentosPage, {}) }), _jsx(Route, { path: "/app/metas", element: _jsx(MetasPage, {}) }), _jsx(Route, { path: "/app/jornada", element: _jsx(JornadaPage, {}) }), _jsx(Route, { path: "/app/ranking", element: _jsx(RankingPage, {}) }), _jsx(Route, { path: "/app/perfil", element: _jsx(PerfilPage, {}) }), _jsx(Route, { path: "/app/resgatar", element: _jsx(ResgatarPage, {}) })] }) }), _jsx(Route, { element: _jsx(ProtectedRoute, { adminOnly: true }), children: _jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/admin", element: _jsx(AdminDashboardPage, {}) }), _jsx(Route, { path: "/admin/usuarios", element: _jsx(AdminUsersPage, {}) }), _jsx(Route, { path: "/admin/usuarios/:id", element: _jsx(AdminUserDetailPage, {}) }), _jsx(Route, { path: "/admin/codigos", element: _jsx(AdminCodesPage, {}) })] }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
