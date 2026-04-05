import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import styles from './ui.module.css';
import { CoinDisplay } from './CoinDisplay';
import { useAuth } from '../../context/AuthContext';
export function AppHeader() {
    const { user, logout } = useAuth();
    const now = new Date();
    const dateLabel = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return (_jsxs("header", { className: styles.header, children: [_jsxs("div", { className: styles.headerLeft, children: [_jsx("div", { className: styles.headerIcon, children: "\uD83D\uDFE9" }), _jsxs("div", { children: [_jsx("div", { className: styles.headerTitle, children: _jsx(Link, { to: "/app/dashboard", children: "ZERO" }) }), _jsx("div", { className: styles.headerSub, children: "Controle Financeiro Pessoal" })] })] }), _jsxs("div", { className: styles.headerRight, children: [_jsx("div", { children: dateLabel }), _jsx("div", { className: styles.mesBadge, children: monthLabel }), _jsxs("div", { style: { marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }, children: [_jsx(CoinDisplay, { amount: user?.coins ?? 0 }), _jsx("button", { className: styles.btnDanger, onClick: logout, children: "Sair" })] })] })] }));
}
