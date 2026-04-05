import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DebtCard } from '../../components/app/DebtCard';
import { useApiQuery } from '../../hooks/useApiQuery';
export function DividasPage() {
    const debts = useApiQuery('debts', '/debts');
    return (_jsxs("div", { children: [_jsx("h1", { children: "D\u00EDvidas" }), _jsx("div", { className: "card-grid", children: (debts.data ?? []).map((d) => _jsx(DebtCard, { debt: d }, d.id)) })] }));
}
