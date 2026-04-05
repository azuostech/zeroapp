import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '../ui/Card';
export function MissionCard({ mission }) {
    return (_jsxs(Card, { children: [_jsx("h4", { children: mission.name }), _jsx("p", { children: mission.description }), _jsxs("p", { children: ["\uD83E\uDE99 ", mission.coinReward] }), _jsx("strong", { children: mission.completed ? 'Concluída' : 'Pendente' })] }));
}
