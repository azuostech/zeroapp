import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    useEffect(() => {
        const token = localStorage.getItem('zero_access_token');
        const serializedUser = localStorage.getItem('zero_user');
        if (token) {
            setAccessToken(token);
            setAuthToken(token);
        }
        if (serializedUser) {
            setUser(JSON.parse(serializedUser));
        }
    }, []);
    const saveSession = (token, nextUser) => {
        setAccessToken(token);
        setUser(nextUser);
        setAuthToken(token);
        localStorage.setItem('zero_access_token', token);
        localStorage.setItem('zero_user', JSON.stringify(nextUser));
    };
    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        saveSession(data.accessToken, data.user);
    };
    const register = async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        saveSession(data.accessToken, data.user);
    };
    const logout = () => {
        setAccessToken(null);
        setUser(null);
        setAuthToken(undefined);
        localStorage.removeItem('zero_access_token');
        localStorage.removeItem('zero_user');
    };
    const value = useMemo(() => ({ user, accessToken, login, register, logout }), [user, accessToken]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth deve ser usado dentro do AuthProvider');
    return ctx;
}
