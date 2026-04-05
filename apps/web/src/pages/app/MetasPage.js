import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GoalCard } from '../../components/app/GoalCard';
import { useApiQuery } from '../../hooks/useApiQuery';
export function MetasPage() {
    const goals = useApiQuery('goals', '/goals');
    return (_jsxs("div", { children: [_jsx("h1", { children: "Metas" }), _jsx("div", { className: "card-grid", children: (goals.data ?? []).map((goal) => _jsx(GoalCard, { goal: goal }, goal.id)) })] }));
}
