import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    return (_jsx("div", { className: "container", style: { padding: '2rem 0' }, children: _jsxs(Card, { children: [_jsx("h2", { children: "Login" }), _jsxs("form", { className: "form-row", onSubmit: async (e) => {
                        e.preventDefault();
                        try {
                            await login(email, password);
                            navigate('/app/dashboard');
                        }
                        catch {
                            setError('Falha no login');
                        }
                    }, children: [_jsx(Input, { placeholder: "E-mail", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true }), _jsx(Input, { placeholder: "Senha", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true }), _jsx(Button, { type: "submit", variant: "primary", children: "Entrar" })] }), _jsx(Button, { style: { marginTop: 8 }, onClick: () => setError('Google OAuth pode ser ligado no backend'), children: "Entrar com Google" }), error && _jsx("p", { style: { color: '#FF5252' }, children: error }), _jsx(Link, { to: "/cadastro", children: "Criar conta" })] }) }));
}
