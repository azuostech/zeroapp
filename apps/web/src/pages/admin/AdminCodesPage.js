import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';
export function AdminCodesPage() {
    const [code, setCode] = useState('');
    const queryClient = useQueryClient();
    const codes = useApiQuery('admin-codes', '/admin/codes');
    return (_jsxs("div", { children: [_jsx("h1", { children: "C\u00F3digos" }), _jsxs("form", { className: "form-row", onSubmit: async (e) => {
                    e.preventDefault();
                    await api.post('/admin/codes', { code, tier: 'MOVIMENTO', coinBonus: 500 });
                    setCode('');
                    await queryClient.invalidateQueries({ queryKey: ['admin-codes'] });
                }, children: [_jsx(Input, { value: code, onChange: (e) => setCode(e.target.value), placeholder: "NOVO-CODIGO", required: true }), _jsx(Button, { variant: "primary", type: "submit", children: "Gerar" })] }), _jsxs(Table, { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "C\u00F3digo" }), _jsx("th", { children: "Tier" }), _jsx("th", { children: "B\u00F4nus" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: (codes.data ?? []).map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.code }), _jsx("td", { children: c.tier }), _jsx("td", { children: c.coinBonus }), _jsx("td", { children: c.usedBy ? 'Usado' : 'Livre' })] }, c.id))) })] })] }));
}
