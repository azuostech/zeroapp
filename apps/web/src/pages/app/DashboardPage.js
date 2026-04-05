import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { TransactionForm } from '../../components/app/TransactionForm';
import { DonutChart } from '../../components/app/DonutChart';
import { MonthSelector } from '../../components/app/MonthSelector';
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';
export function DashboardPage() {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const queryClient = useQueryClient();
    const summary = useApiQuery('summary', `/transactions/summary/${month}`);
    return (_jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), _jsx(MonthSelector, { value: month, onChange: setMonth }), _jsxs("div", { className: "card-grid section", children: [_jsxs(Card, { children: [_jsx("h3", { children: "Entradas" }), _jsxs("p", { children: ["R$ ", summary.data?.entradas?.toFixed(2) ?? '0.00'] })] }), _jsxs(Card, { children: [_jsx("h3", { children: "Sa\u00EDdas" }), _jsxs("p", { children: ["R$ ", summary.data?.saidas?.toFixed(2) ?? '0.00'] })] }), _jsxs(Card, { children: [_jsx("h3", { children: "Saldo" }), _jsxs("p", { children: ["R$ ", summary.data?.saldo?.toFixed(2) ?? '0.00'] })] }), _jsx(Card, { children: _jsx(DonutChart, { percent: summary.data ? (summary.data.saidas / Math.max(summary.data.entradas, 1)) * 100 : 0 }) })] }), _jsxs("div", { className: "section", children: [_jsx("h3", { children: "Novo lan\u00E7amento" }), _jsx(TransactionForm, { onSubmit: async (payload) => {
                            await api.post('/transactions', payload);
                            await queryClient.invalidateQueries({ queryKey: ['summary'] });
                        } })] })] }));
}
