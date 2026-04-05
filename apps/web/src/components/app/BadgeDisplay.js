import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Card } from '../ui/Card';
export function BadgeDisplay({ items }) {
    return (_jsx("div", { className: "card-grid", children: items.map((b, i) => (_jsx(Card, { children: _jsxs("h4", { children: [b.badge.icon, " ", b.badge.name] }) }, i))) }));
}
