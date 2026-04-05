import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';
export function AdminDashboardPage() {
    const metrics = useApiQuery('admin-metrics', '/admin/metrics');
    return (_jsxs("div", { children: [_jsx("h1", { children: "Admin" }), _jsxs("div", { className: "card-grid", children: [_jsxs(Card, { children: [_jsx("h4", { children: "Usu\u00E1rios" }), _jsx("p", { children: metrics.data?.users ?? 0 })] }), _jsxs(Card, { children: [_jsx("h4", { children: "Ativos" }), _jsx("p", { children: metrics.data?.activeUsers ?? 0 })] }), _jsxs(Card, { children: [_jsx("h4", { children: "Transa\u00E7\u00F5es" }), _jsx("p", { children: metrics.data?.transactions ?? 0 })] }), _jsxs(Card, { children: [_jsx("h4", { children: "Total Coins" }), _jsx("p", { children: metrics.data?.totalCoins ?? 0 })] })] })] }));
}
