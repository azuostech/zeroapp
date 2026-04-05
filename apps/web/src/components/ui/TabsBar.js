import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import styles from './ui.module.css';
import { useAuth } from '../../context/AuthContext';
const tabs = [
    { to: '/app/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/app/entradas', icon: '⬆️', label: 'Entradas' },
    { to: '/app/saidas', icon: '⬇️', label: 'Saídas' },
    { to: '/app/dividas', icon: '💳', label: 'Dívidas' },
    { to: '/app/investimentos', icon: '📈', label: 'Investimentos' },
    { to: '/app/metas', icon: '🎯', label: 'Metas' },
    { to: '/app/jornada', icon: '🦸', label: 'Jornada' },
    { to: '/app/ranking', icon: '🏆', label: 'Ranking' },
    { to: '/app/perfil', icon: '👤', label: 'Perfil' },
    { to: '/app/resgatar', icon: '🎟️', label: 'Resgatar' },
    { to: '/admin', icon: '🛠️', label: 'Admin' }
];
export function TabsBar() {
    const { user } = useAuth();
    const visibleTabs = tabs.filter((tab) => tab.to !== '/admin' || user?.role === 'ADMIN');
    return (_jsx("nav", { className: styles.tabsBar, children: visibleTabs.map((tab) => (_jsxs(NavLink, { to: tab.to, className: ({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`.trim(), children: [_jsx("span", { className: styles.tabIcon, children: tab.icon }), tab.label] }, tab.to))) }));
}
