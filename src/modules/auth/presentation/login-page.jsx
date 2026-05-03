'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/src/lib/supabase/browser';

const THEME_KEY = 'zeroapp-theme';

function translateError(msg = '') {
  if (msg.includes('Invalid login')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('Email rate limit exceeded')) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (msg.includes('Invalid email')) return 'Informe um e-mail válido.';
  if (msg.includes('not found')) return 'Não encontramos esse e-mail.';
  if (msg.includes('Gateway Timeout') || msg.includes('504')) {
    return 'Cadastro indisponível no momento (timeout no servidor). Verifique SMTP/Email no Supabase e tente novamente.';
  }
  return msg || 'Não foi possível concluir a ação.';
}

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] = useState('login');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [theme, setTheme] = useState('dark');

  const getClient = () => {
    try {
      return getBrowserSupabase();
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    let nextTheme = 'dark';
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') nextTheme = saved;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) nextTheme = 'light';
    } catch (_) {
      // no-op
    }
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      // no-op
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const sb = getClient();
      if (!sb) return;

      const {
        data: { session }
      } = await sb.auth.getSession();

      if (!session || cancelled) return;

      const res = await fetch('/api/profile/me', { cache: 'no-store' });
      if (!res.ok || cancelled) return;

      const payload = await res.json();
      const profile = payload?.profile;

      if (!profile || profile.status !== 'active') {
        await sb.auth.signOut();
        return;
      }

      router.replace(profile.role === 'admin' ? '/admin' : '/app');
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== 'success') return;
    setTab('login');
    setForgotMode(false);
    setForgotSent(false);
    setMessage({ text: 'Senha redefinida com sucesso. Faça login com sua nova senha.', type: 'success' });
  }, []);

  const clearMsg = () => setMessage({ text: '', type: '' });

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setPendingVisible(false);
    setForgotMode(false);
    setForgotSent(false);
    clearMsg();
  };

  const openForgotPassword = () => {
    setForgotMode(true);
    setForgotSent(false);
    setForgotEmail(loginEmail.trim());
    clearMsg();
  };

  const closeForgotPassword = () => {
    setForgotMode(false);
    setForgotSent(false);
    clearMsg();
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    clearMsg();

    const sb = getClient();
    if (!sb) {
      setMessage({ text: 'Configuração do Supabase ausente no ambiente.', type: 'error' });
      setLoginLoading(false);
      return;
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });

    if (error) {
      setMessage({ text: translateError(error.message), type: 'error' });
      setLoginLoading(false);
      return;
    }

    const res = await fetch('/api/profile/me', { cache: 'no-store' });
    if (!res.ok) {
      await sb.auth.signOut();
      setMessage({ text: 'Não foi possível carregar o perfil da conta.', type: 'error' });
      setLoginLoading(false);
      return;
    }

    const payload = await res.json();
    const profile = payload?.profile;

    if (!profile || profile.status === 'pending') {
      await sb.auth.signOut();
      setMessage({ text: 'Sua conta ainda está aguardando aprovação. Entraremos em contato em breve.', type: 'error' });
      setLoginLoading(false);
      return;
    }

    if (profile.status === 'disabled') {
      await sb.auth.signOut();
      setMessage({ text: 'Sua conta foi desativada. Entre em contato com o suporte.', type: 'error' });
      setLoginLoading(false);
      return;
    }

    const user = data?.user;
    if (!user) {
      setMessage({ text: 'Não foi possível validar sua sessão.', type: 'error' });
      setLoginLoading(false);
      return;
    }

    router.replace(profile.role === 'admin' ? '/admin' : '/app');
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setSignupLoading(true);
    clearMsg();

    const sb = getClient();
    if (!sb) {
      setMessage({ text: 'Configuração do Supabase ausente no ambiente.', type: 'error' });
      setSignupLoading(false);
      return;
    }

    const { error } = await sb.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          full_name: signupName.trim(),
          phone: signupPhone.trim()
        }
      }
    });

    if (error) {
      setMessage({ text: translateError(error.message), type: 'error' });
      setSignupLoading(false);
      return;
    }

    setPendingVisible(true);
    setSignupLoading(false);
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setForgotLoading(true);
    clearMsg();

    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Não foi possível enviar o link de recuperação.');
      }

      setForgotSent(true);
      setMessage({ text: 'Link enviado! Verifique sua caixa de entrada e também o spam.', type: 'success' });
    } catch (error) {
      setMessage({ text: translateError(error.message), type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="bg-glow" />

      <div className="card">
        <div className="theme-switch-wrap">
          <div className="theme-switch">
            <button type="button" className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
              Claro
            </button>
            <button type="button" className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
              Escuro
            </button>
          </div>
        </div>

        <div className="brand">
          <div className="brand-mark">💚</div>
          <div className="brand-name">Jackson Souza</div>
          <div className="brand-sub">Finanças do Zero</div>
        </div>

        <div className="form-box">
          <div className="tabs">
            <div className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
              Entrar
            </div>
            <div className={`tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>
              Criar conta
            </div>
          </div>

          <div className={`msg ${message.type}`} style={{ display: message.text ? 'block' : 'none' }}>
            {message.text}
          </div>

          <div style={{ display: tab === 'login' ? 'block' : 'none' }}>
            <form style={{ display: forgotMode ? 'none' : 'block' }} onSubmit={handleLogin}>
              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <button type="button" className="forgot-link" onClick={openForgotPassword}>
                Esqueci minha senha
              </button>
              <button type="submit" className="btn-main" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <span className="spinner" /> Aguarde...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <form style={{ display: forgotMode ? 'block' : 'none' }} onSubmit={handleForgotPassword}>
              <div className="forgot-head">{forgotSent ? 'E-mail enviado!' : 'Recuperar senha'}</div>
              <div className="forgot-sub">
                {forgotSent
                  ? 'Se o e-mail estiver cadastrado, você receberá um link para criar nova senha.'
                  : 'Digite seu e-mail para receber o link de recuperação.'}
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={forgotLoading}
                />
              </div>
              <button type="submit" className="btn-main" disabled={forgotLoading}>
                {forgotLoading ? (
                  <>
                    <span className="spinner" /> Enviando...
                  </>
                ) : (
                  'Enviar link'
                )}
              </button>
              <button type="button" className="back-link-btn" onClick={closeForgotPassword} disabled={forgotLoading}>
                Voltar para login
              </button>
            </form>
          </div>

          <form style={{ display: tab === 'signup' && !pendingVisible ? 'block' : 'none' }} onSubmit={handleSignup}>
            <div className="form-group">
              <label>Nome completo</label>
              <input type="text" placeholder="Seu nome" required value={signupName} onChange={(e) => setSignupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                required
                autoComplete="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Telefone / WhatsApp</label>
              <input type="text" placeholder="(47) 99999-9999" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-main" disabled={signupLoading}>
              {signupLoading ? (
                <>
                  <span className="spinner" /> Aguarde...
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          <div className="pending-box" style={{ display: pendingVisible ? 'block' : 'none' }}>
            <div className="pending-icon">⏳</div>
            <div className="pending-title">Cadastro realizado!</div>
            <div className="pending-text">
              Sua conta está em análise. Em breve você receberá uma confirmação e poderá acessar a plataforma.
            </div>
          </div>
        </div>

        <div className="footer-note">Plataforma exclusiva · Jackson Souza · Método Finanças do Zero</div>
      </div>

      <style jsx>{`
        :global(:root) {
          --bg: #0a0a0a;
          --bg2: #111111;
          --bg3: #181818;
          --border: #222;
          --green: #00c853;
          --green-dim: rgba(0, 200, 83, 0.1);
          --green-glow: rgba(0, 200, 83, 0.2);
          --text: #f0f0f0;
          --muted: #555;
          --dim: #888;
          --red: #ff4444;
          --theme-pill: #141414;
          --theme-pill-border: #2a2a2a;
          --theme-pill-btn: transparent;
          --theme-pill-active-bg: #00c853;
          --theme-pill-active-text: #04110a;
          --theme-pill-text: #b2c7ba;
        }

        :global(:root[data-theme='light']) {
          --bg: #eef4f0;
          --bg2: #ffffff;
          --bg3: #e6eee8;
          --border: #cddad1;
          --green: #00a54a;
          --green-dim: rgba(0, 165, 74, 0.12);
          --green-glow: rgba(0, 165, 74, 0.16);
          --text: #16261d;
          --muted: #637a6f;
          --dim: #41564c;
          --red: #d53f3f;
          --theme-pill: #f6faf7;
          --theme-pill-border: #c6d6cb;
          --theme-pill-btn: transparent;
          --theme-pill-active-bg: #00a54a;
          --theme-pill-active-text: #ffffff;
          --theme-pill-text: #385146;
        }

        .login-shell {
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          padding: 16px;
        }

        .login-shell::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: linear-gradient(rgba(0, 200, 83, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 200, 83, 0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .bg-glow {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 200, 83, 0.06) 0%, transparent 70%);
          pointer-events: none;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: breathe 6s ease-in-out infinite;
        }

        @keyframes breathe {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 1;
          }
        }

        .card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 20px;
          animation: fadeUp 0.5s ease both;
        }

        .theme-switch-wrap {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
        }

        .theme-switch {
          display: inline-flex;
          background: var(--theme-pill);
          border: 1px solid var(--theme-pill-border);
          border-radius: 999px;
          padding: 3px;
          gap: 3px;
        }

        .theme-btn {
          border: none;
          background: var(--theme-pill-btn);
          color: var(--theme-pill-text);
          border-radius: 999px;
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 11px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .theme-btn.active {
          background: var(--theme-pill-active-bg);
          color: var(--theme-pill-active-text);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .brand {
          text-align: center;
          margin-bottom: 36px;
        }

        .brand-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--green-dim);
          border: 1px solid rgba(0, 200, 83, 0.25);
          margin-bottom: 16px;
          font-size: 24px;
        }

        .brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.3px;
        }

        .brand-sub {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 2.5px;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .form-box {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px 28px;
          backdrop-filter: blur(10px);
        }

        .tabs {
          display: flex;
          gap: 0;
          background: var(--bg3);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 28px;
        }

        .tab {
          flex: 1;
          text-align: center;
          padding: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--dim);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .tab.active {
          background: var(--bg2);
          color: var(--text);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
          margin-bottom: 7px;
        }

        input[type='text'],
        input[type='email'],
        input[type='password'] {
          width: 100%;
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          padding: 12px 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        input:focus {
          border-color: rgba(0, 200, 83, 0.4);
          box-shadow: 0 0 0 3px rgba(0, 200, 83, 0.07);
        }

        input::placeholder {
          color: var(--muted);
        }

        .btn-main {
          width: 100%;
          background: var(--green);
          color: #000;
          border: none;
          border-radius: 10px;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 600;
          padding: 13px;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.3px;
        }

        .btn-main:hover {
          background: #00df5e;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 200, 83, 0.25);
        }

        .btn-main:active {
          transform: translateY(0);
        }

        .btn-main:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .forgot-link {
          border: none;
          background: transparent;
          color: var(--green);
          font-size: 12px;
          margin-top: -4px;
          margin-bottom: 8px;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }

        .forgot-link:hover {
          color: #00df5e;
        }

        .forgot-head {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          margin-bottom: 6px;
        }

        .forgot-sub {
          color: var(--dim);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 18px;
        }

        .back-link-btn {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: transparent;
          color: var(--dim);
          font-size: 13px;
          padding: 11px;
          margin-top: 10px;
          cursor: pointer;
        }

        .back-link-btn:hover {
          border-color: var(--green);
          color: var(--text);
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .msg {
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          margin-bottom: 16px;
          display: none;
        }

        .msg.error {
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.25);
          color: #ff8080;
          display: block;
        }

        .msg.success {
          background: rgba(0, 200, 83, 0.1);
          border: 1px solid rgba(0, 200, 83, 0.25);
          color: var(--green);
          display: block;
        }

        .pending-box {
          text-align: center;
          padding: 20px 0;
          display: none;
        }

        .pending-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .pending-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .pending-text {
          font-size: 13px;
          color: var(--dim);
          line-height: 1.6;
        }

        .footer-note {
          text-align: center;
          margin-top: 20px;
          font-size: 11px;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
