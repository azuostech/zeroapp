import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
export function CodeRedeemForm({ onSubmit }) {
    const [code, setCode] = useState('');
    return (_jsxs("form", { className: "form-row", onSubmit: async (e) => {
            e.preventDefault();
            await onSubmit(code);
            setCode('');
        }, children: [_jsx(Input, { placeholder: "C\u00F3digo de ingresso", value: code, onChange: (e) => setCode(e.target.value), required: true }), _jsx(Button, { variant: "primary", type: "submit", children: "Resgatar" })] }));
}
