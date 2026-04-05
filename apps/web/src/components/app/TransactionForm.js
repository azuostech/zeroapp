import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
export function TransactionForm({ onSubmit }) {
    const [type, setType] = useState('ENTRADA');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    return (_jsxs("form", { className: "form-row", onSubmit: async (e) => {
            e.preventDefault();
            await onSubmit({ type, description, category, amount: Number(amount), date });
            setDescription('');
            setCategory('');
            setAmount('');
        }, children: [_jsxs(Select, { value: type, onChange: (e) => setType(e.target.value), children: [_jsx("option", { value: "ENTRADA", children: "Entrada" }), _jsx("option", { value: "SAIDA", children: "Sa\u00EDda" })] }), _jsx(Input, { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Descri\u00E7\u00E3o", required: true }), _jsx(Input, { value: category, onChange: (e) => setCategory(e.target.value), placeholder: "Categoria", required: true }), _jsx(Input, { value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "Valor", type: "number", step: "0.01", required: true }), _jsx(Input, { value: date, onChange: (e) => setDate(e.target.value), type: "date", required: true }), _jsx(Button, { variant: "primary", type: "submit", children: "Salvar" })] }));
}
