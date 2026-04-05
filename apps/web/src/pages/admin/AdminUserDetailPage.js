import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';
export function AdminUserDetailPage() {
    const { id } = useParams();
    const user = useApiQuery('admin-user', `/admin/users/${id}`);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Detalhe do Usu\u00E1rio" }), _jsx(Card, { children: _jsx("pre", { style: { whiteSpace: 'pre-wrap' }, children: JSON.stringify(user.data ?? {}, null, 2) }) })] }));
}
