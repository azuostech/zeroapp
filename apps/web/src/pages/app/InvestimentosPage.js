import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';
export function InvestimentosPage() {
    const investments = useApiQuery('investments', '/investments');
    return (_jsxs("div", { children: [_jsx("h1", { children: "Investimentos" }), _jsx("div", { className: "card-grid", children: (investments.data ?? []).map((i) => (_jsxs(Card, { children: [_jsx("h4", { children: i.institution }), _jsxs("p", { children: [i.type, " - R$ ", i.amount.toFixed(2)] })] }, i.id))) })] }));
}
