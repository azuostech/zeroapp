import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
export function GoalCard({ goal }) {
    const pct = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    return (_jsxs(Card, { children: [_jsx("h4", { children: goal.name }), _jsx(ProgressBar, { value: pct }), _jsxs("small", { children: [pct.toFixed(0), "%"] })] }));
}
