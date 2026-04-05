import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Table } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
export function AdminUsersPage() {
    const users = useApiQuery('admin-users', '/admin/users');
    return (_jsxs("div", { children: [_jsx("h1", { children: "Usu\u00E1rios" }), _jsxs(Table, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Nome" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Tier" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Detalhe" })] }) }), _jsx("tbody", { children: (users.data ?? []).map((u) => (_jsxs("tr", { children: [_jsx("td", { children: u.name }), _jsx("td", { children: u.email }), _jsx("td", { children: u.tier }), _jsx("td", { children: u.isActive ? 'Ativo' : 'Bloqueado' }), _jsx("td", { children: _jsx(Link, { to: `/admin/usuarios/${u.id}`, children: "Abrir" }) })] }, u.id))) })] })] }));
}
