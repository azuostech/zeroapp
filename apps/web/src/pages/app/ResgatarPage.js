import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../../api/client';
import { CodeRedeemForm } from '../../components/app/CodeRedeemForm';
import { Card } from '../../components/ui/Card';
export function ResgatarPage() {
    const [message, setMessage] = useState('');
    return (_jsxs("div", { children: [_jsx("h1", { children: "Resgatar C\u00F3digo" }), _jsxs(Card, { children: [_jsx(CodeRedeemForm, { onSubmit: async (code) => {
                            const { data } = await api.post('/redeem', { code });
                            setMessage(`Camada: ${data.tier} | Bônus: ${data.bonus}`);
                        } }), message && _jsx("p", { children: message })] })] }));
}
