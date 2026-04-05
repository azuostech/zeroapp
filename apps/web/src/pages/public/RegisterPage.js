import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
export function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return (_jsx("div", { className: "container", style: { padding: '2rem 0' }, children: _jsxs(Card, { children: [_jsx("h2", { children: "Cadastro" }), _jsxs("form", { className: "form-row", onSubmit: async (e) => {
                        e.preventDefault();
                        await register(name, email, password);
                        navigate('/app/dashboard');
                    }, children: [_jsx(Input, { placeholder: "Nome", value: name, onChange: (e) => setName(e.target.value), required: true }), _jsx(Input, { placeholder: "E-mail", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx(Input, { placeholder: "Senha", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true }), _jsx(Button, { type: "submit", variant: "primary", children: "Criar conta" })] }), _jsx(Link, { to: "/login", children: "J\u00E1 tenho conta" })] }) }));
}
