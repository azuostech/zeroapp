import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MissionCard } from '../../components/app/MissionCard';
import { CoinDisplay } from '../../components/ui/CoinDisplay';
import { PhaseChip } from '../../components/ui/PhaseChip';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
export function JornadaPage() {
    const { user } = useAuth();
    const missions = useApiQuery('missions', '/missions');
    return (_jsxs("div", { children: [_jsx("h1", { className: "sectionTitle", children: "\uD83E\uDDB8 Jornada do Her\u00F3i" }), _jsx("p", { className: "sectionDesc", children: "Evolua de fase, complete miss\u00F5es e desbloqueie badges." }), _jsxs("p", { children: [_jsx(PhaseChip, { phase: user?.phase ?? 'BOMBEIRO' }), " ", _jsx(CoinDisplay, { amount: user?.coins ?? 0 })] }), _jsx("div", { className: "card-grid", children: (missions.data ?? []).map((m) => _jsx(MissionCard, { mission: m }, m.id)) })] }));
}
