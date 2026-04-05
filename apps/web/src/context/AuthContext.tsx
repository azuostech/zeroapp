import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client';
import type { User } from '../types/auth';

interface AuthContextData {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  const saveSession = (token: string, nextUser: User) => {
    setAccessToken(token);
    setUser(nextUser);
    setAuthToken(token);
    localStorage.setItem('zero_access_token', token);
    localStorage.setItem('zero_user', JSON.stringify(nextUser));
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data.accessToken, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider');
  return ctx;
}
