import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export function RankingRow({ rank, row }) {
    return (_jsxs("tr", { children: [_jsxs("td", { children: ["#", rank] }), _jsx("td", { children: row.name }), _jsx("td", { children: row.phase }), _jsxs("td", { children: ["\uD83E\uDE99 ", row.totalCoins] })] }));
}
