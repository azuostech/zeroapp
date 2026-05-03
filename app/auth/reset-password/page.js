'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/src/lib/supabase/browser';
import styles from './styles.module.css';

function readHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash);
}

function cleanRecoveryUrl() {
  window.history.replaceState({}, '', '/auth/reset-password');
}

function friendlyError(message = '') {
  if (message.includes('Auth session missing')) return 'Sessão de recuperação inválida. Solicite um novo link.';
  if (message.includes('token') && message.includes('expired')) return 'Link de recuperação expirado. Solicite um novo link.';
  if (message.includes('invalid')) return 'Link de recuperação inválido. Solicite um novo link.';
  return message || 'Não foi possível validar o link de recuperação.';
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapRecoverySession() {
      try {
        const sb = getBrowserSupabase();
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const tokenHash = queryParams.get('token_hash');
        const queryType = queryParams.get('type');
        const hashParams = readHashParams();
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        if (code) {
          const { error: codeError } = await sb.auth.exchangeCodeForSession(code);
          if (codeError) throw codeError;
          cleanRecoveryUrl();
        } else if (tokenHash && queryType) {
          const { error: otpError } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: queryType });
          if (otpError) throw otpError;
          cleanRecoveryUrl();
        } else if (hashType === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (sessionError) throw sessionError;
          cleanRecoveryUrl();
        }

        const {
          data: { session }
        } = await sb.auth.getSession();

        if (!session) {
          throw new Error('Link de recuperação inválido ou expirado');
        }

        if (!cancelled) {
          setAllowed(true);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setAllowed(false);
          setError(friendlyError(err?.message));
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    bootstrapRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleResetPassword(event) {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao atualizar senha');
      }

      try {
        const sb = getBrowserSupabase();
        await sb.auth.signOut();
      } catch (_) {
        // Se não conseguir limpar a sessão local, seguimos com o redirect.
      }
      setSuccess(true);

      setTimeout(() => {
        router.replace('/?reset=success');
      }, 1800);
    } catch (err) {
      setError(friendlyError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className={styles.shell}>
        <section className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Senha alterada com sucesso!</h1>
          <p className={styles.subtitle}>Redirecionando para o login...</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <h1 className={styles.title}>Criar nova senha</h1>
        <p className={styles.subtitle}>Digite sua nova senha abaixo.</p>

        {initializing ? (
          <p className={styles.info}>Validando seu link de recuperação...</p>
        ) : null}

        {error ? <div className={styles.alertError}>{error}</div> : null}

        <form className={styles.form} onSubmit={handleResetPassword}>
          <label className={styles.label} htmlFor="password">
            Nova senha
          </label>
          <input
            className={styles.input}
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
            disabled={loading || initializing || !allowed}
          />

          <label className={styles.label} htmlFor="confirmPassword">
            Confirmar senha
          </label>
          <input
            className={styles.input}
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Digite a senha novamente"
            required
            disabled={loading || initializing || !allowed}
          />

          <button className={styles.primaryButton} type="submit" disabled={loading || initializing || !allowed}>
            {loading ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </form>

        <a className={styles.backLink} href="/">
          Voltar para o login
        </a>
      </section>
    </main>
  );
}
