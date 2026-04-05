import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
export function DebtCard({ debt }) {
    return (_jsxs(Card, { children: [_jsx("h4", { children: debt.creditor }), _jsxs("p", { children: ["R$ ", debt.totalAmount.toFixed(2)] }), _jsx(Badge, { children: debt.status })] }));
}
