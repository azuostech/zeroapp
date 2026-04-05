import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RankingRow } from '../../components/app/RankingRow';
import { Table } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
export function RankingPage() {
    const ranking = useApiQuery('ranking', '/ranking');
    return (_jsxs("div", { children: [_jsx("h1", { className: "sectionTitle", children: "\uD83C\uDFC6 Ranking" }), _jsx("p", { className: "sectionDesc", children: "Leaderboard com usu\u00E1rios participantes e evolu\u00E7\u00E3o por fase." }), _jsxs(Table, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Nome" }), _jsx("th", { children: "Fase" }), _jsx("th", { children: "Coins" })] }) }), _jsx("tbody", { children: (ranking.data ?? []).map((row, idx) => _jsx(RankingRow, { rank: idx + 1, row: row }, row.id)) })] })] }));
}
