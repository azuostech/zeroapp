import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
];
export function AppLayout() {
    const { user, logout } = useAuth();
    return (_jsxs("div", { className: "app-grid", children: [_jsxs("aside", { className: "sidebar", children: [_jsx(Link, { to: "/app/dashboard", children: _jsx("h2", { children: "ZERO" }) }), _jsx("p", { style: { color: '#aaa' }, children: user?.name }), _jsxs("nav", { style: { display: 'grid', gap: 8 }, children: [appLinks.map(([to, label]) => (_jsx(NavLink, { to: to, children: label }, to))), user?.role === 'ADMIN' && _jsx(NavLink, { to: "/admin", children: "Admin" })] }), _jsx("div", { style: { marginTop: 16 }, children: _jsx(Button, { variant: "danger", onClick: logout, children: "Sair" }) })] }), _jsx("main", { className: "main-content", children: _jsx(Outlet, {}) })] }));
}
