import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';
export function SaidasPage() {
    const month = new Date().toISOString().slice(0, 7);
    const transactions = useApiQuery('tx-saidas', `/transactions?month=${month}`);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Sa\u00EDdas" }), _jsx("div", { className: "card-grid", children: (transactions.data ?? []).filter((t) => t.type === 'SAIDA').map((t) => (_jsxs(Card, { children: [_jsx("strong", { children: t.description }), _jsxs("p", { children: ["R$ ", t.amount.toFixed(2)] })] }, t.id))) })] }));
}
