'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import { TierBadge } from '@/components/gamification/TierBadge';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (_) {
    return '—';
  }
}

function statusLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'active') return 'Ativo';
  if (normalized === 'inactive') return 'Inativo';
  return value || '—';
}

function resolveTierAvatarClass(tier) {
  const normalized = String(tier || 'DESPERTAR').toUpperCase();
  if (normalized === 'MOVIMENTO') return 'tier-movimento';
  if (normalized === 'ACELERACAO') return 'tier-aceleracao';
  if (normalized === 'AUTOGOVERNO') return 'tier-autogoverno';
  return 'tier-despertar';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export default function PerfilPage() {
  const [isIAOpen, setIsIAOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  const [emailDraft, setEmailDraft] = useState('');
  const [emailLoading, setEmailLoading] = useState(true);
  const [canChangeEmail, setCanChangeEmail] = useState(false);
  const [blockedBy, setBlockedBy] = useState([]);
  const [checksFailed, setChecksFailed] = useState([]);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState({ type: '', text: '' });

  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setEmailLoading(true);
      setLoadError('');

      try {
        const [profileRes, emailRes] = await Promise.all([
          fetch('/api/profile/me', { cache: 'no-store' }),
          fetch('/api/profile/email', { cache: 'no-store' })
        ]);

        const profilePayload = await profileRes.json().catch(() => ({}));
        const emailPayload = await emailRes.json().catch(() => ({}));

        if (!mounted) return;

        if (!profileRes.ok) {
          throw new Error(profilePayload?.error || 'Não foi possível carregar seu perfil.');
        }

        setProfile(profilePayload?.profile || null);
        const currentEmail = String(profilePayload?.user?.email || profilePayload?.profile?.email || '').trim();
        setUserEmail(currentEmail);
        setEmailDraft(currentEmail);

        if (emailRes.ok) {
          setCanChangeEmail(Boolean(emailPayload?.can_change_email));
          setBlockedBy(Array.isArray(emailPayload?.blocked_by) ? emailPayload.blocked_by : []);
          setChecksFailed(Array.isArray(emailPayload?.checks_failed) ? emailPayload.checks_failed : []);
        } else {
          setCanChangeEmail(false);
          setChecksFailed([{ label: 'Validação de vínculos', error: emailPayload?.error || 'Não foi possível validar agora.' }]);
        }
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Erro ao carregar perfil.');
      } finally {
        if (!mounted) return;
        setLoading(false);
        setEmailLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const accountCreatedAt = useMemo(() => formatDate(profile?.created_at), [profile?.created_at]);
  const fullName = useMemo(() => String(profile?.full_name || 'Mentorado').trim() || 'Mentorado', [profile?.full_name]);
  const firstName = useMemo(() => fullName.split(/\s+/)[0] || 'Mentorado', [fullName]);
  const profileInitial = useMemo(() => firstName.charAt(0).toUpperCase() || 'M', [firstName]);
  const safeTier = useMemo(() => String(profile?.tier || 'DESPERTAR').toUpperCase(), [profile?.tier]);
  const avatarTierClass = resolveTierAvatarClass(safeTier);

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setEmailFeedback({ type: '', text: '' });

    const nextEmail = String(emailDraft || '').trim().toLowerCase();
    const current = String(userEmail || '').trim().toLowerCase();

    if (!isValidEmail(nextEmail)) {
      setEmailFeedback({ type: 'error', text: 'Informe um e-mail válido.' });
      return;
    }

    if (nextEmail === current) {
      setEmailFeedback({ type: 'error', text: 'Digite um e-mail diferente do atual.' });
      return;
    }

    if (!canChangeEmail) {
      setEmailFeedback({ type: 'error', text: 'Não é possível alterar o e-mail porque sua conta possui vínculos no banco.' });
      return;
    }

    setEmailSaving(true);
    try {
      const response = await fetch('/api/profile/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nextEmail })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setEmailFeedback({ type: 'error', text: payload?.error || 'Não foi possível alterar seu e-mail.' });
        return;
      }

      setEmailFeedback({
        type: 'success',
        text: payload?.message || 'Solicitação enviada. Verifique os e-mails para confirmar a alteração.'
      });
    } catch (_) {
      setEmailFeedback({ type: 'error', text: 'Erro de conexão ao alterar e-mail.' });
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordFeedback({ type: '', text: '' });

    if (passwordDraft.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (passwordDraft !== passwordConfirm) {
      setPasswordFeedback({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordDraft })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPasswordFeedback({ type: 'error', text: payload?.error || 'Não foi possível alterar sua senha.' });
        return;
      }

      setPasswordDraft('');
      setPasswordConfirm('');
      setPasswordFeedback({ type: 'success', text: 'Senha alterada com sucesso.' });
    } catch (_) {
      setPasswordFeedback({ type: 'error', text: 'Erro de conexão ao alterar senha.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="perfil-screen">
      <AppHeader />

      <main className="perfil-shell page-content">
        <header className="perfil-header">
          <div>
            <h1 className="text-display">Perfil</h1>
            <p>Gerencie seus dados de acesso e segurança da conta.</p>
          </div>
          <Link href="/app" className="back-link">Voltar ao início</Link>
        </header>

        {loading ? <div className="feedback">Carregando perfil...</div> : null}
        {loadError ? <div className="feedback error">{loadError}</div> : null}

        {!loading && !loadError ? (
          <>
            <section className="profile-hero card">
              <div className="hero-main">
                <div className={`profile-avatar ${avatarTierClass}`} aria-hidden="true">{profileInitial}</div>
                <div className="hero-copy">
                  <h2>{firstName}</h2>
                  <p>{userEmail || 'Sem e-mail cadastrado'}</p>
                  <TierBadge tier={safeTier} size="sm" />
                </div>
              </div>
            </section>

            <section className="card">
              <h2>Informações do usuário</h2>
              <div className="info-grid">
                <div>
                  <span className="label">Nome</span>
                  <strong>{profile?.full_name || 'Não informado'}</strong>
                </div>
                <div>
                  <span className="label">E-mail atual</span>
                  <strong>{userEmail || 'Não informado'}</strong>
                </div>
                <div>
                  <span className="label">Telefone</span>
                  <strong>{profile?.phone || 'Não informado'}</strong>
                </div>
                <div>
                  <span className="label">Tier</span>
                  <strong>{safeTier}</strong>
                </div>
                <div>
                  <span className="label">Status</span>
                  <strong>{statusLabel(profile?.status)}</strong>
                </div>
                <div>
                  <span className="label">Conta criada em</span>
                  <strong>{accountCreatedAt}</strong>
                </div>
              </div>
            </section>

            <section className="card account-links">
              <h2>Acesso rápido</h2>
              <Link href="/jornada" className="menu-item">
                <span className="menu-icon">🏆</span>
                <span className="menu-label">Conquistas</span>
                <span className="menu-arrow">›</span>
              </Link>
              <Link href="/mavf" className="menu-item">
                <span className="menu-icon">🌱</span>
                <span className="menu-label">Minha Jornada</span>
                <span className="menu-arrow">›</span>
              </Link>
              <Link href="/financas" className="menu-item">
                <span className="menu-icon">💰</span>
                <span className="menu-label">Finanças</span>
                <span className="menu-arrow">›</span>
              </Link>
            </section>

            <section className="card">
              <h2>Alterar e-mail</h2>
              <p className="helper-text">Disponível somente quando a conta não possui vínculos de dados no banco.</p>

              {emailLoading ? <div className="feedback small">Validando vínculos...</div> : null}

              {!emailLoading && !canChangeEmail ? (
                <div className="warning-box">
                  <p>Esta conta possui vínculos e não pode alterar e-mail neste momento.</p>
                  {blockedBy.length > 0 ? (
                    <ul>
                      {blockedBy.map((item) => (
                        <li key={item.table}>{item.label}</li>
                      ))}
                    </ul>
                  ) : null}
                  {checksFailed.length > 0 ? <p className="warning-detail">Falha na validação de alguns vínculos. Tente novamente mais tarde.</p> : null}
                </div>
              ) : null}

              <form className="stack-form" onSubmit={handleEmailSubmit}>
                <label htmlFor="novo-email">Novo e-mail</label>
                <input
                  id="novo-email"
                  type="email"
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  disabled={!canChangeEmail || emailLoading || emailSaving}
                  autoComplete="email"
                />
                <button type="submit" disabled={!canChangeEmail || emailLoading || emailSaving}>
                  {emailSaving ? 'Enviando...' : 'Solicitar alteração de e-mail'}
                </button>
              </form>

              {emailFeedback.text ? (
                <div className={`feedback ${emailFeedback.type === 'error' ? 'error' : 'success'}`} role="status">
                  {emailFeedback.text}
                </div>
              ) : null}
            </section>

            <section className="card">
              <h2>Alterar senha</h2>

              <form className="stack-form" onSubmit={handlePasswordSubmit}>
                <label htmlFor="nova-senha">Nova senha</label>
                <input
                  id="nova-senha"
                  type="password"
                  value={passwordDraft}
                  onChange={(event) => setPasswordDraft(event.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  disabled={passwordSaving}
                />

                <label htmlFor="confirmar-senha">Confirmar nova senha</label>
                <input
                  id="confirmar-senha"
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  disabled={passwordSaving}
                />

                <button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? 'Salvando...' : 'Alterar senha'}
                </button>
              </form>

              {passwordFeedback.text ? (
                <div className={`feedback ${passwordFeedback.type === 'error' ? 'error' : 'success'}`} role="status">
                  {passwordFeedback.text}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>

      <BottomNav />
      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />

      <style jsx>{`
        .perfil-screen {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }

        .perfil-shell {
          min-height: 100vh;
          max-width: 900px;
          margin: 0 auto;
          background: var(--bg);
          padding: 18px 14px calc(120px + env(safe-area-inset-bottom));
          display: grid;
          gap: 12px;
        }

        .perfil-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .perfil-header h1 {
          margin: 0;
          font-size: 22px;
          font-family: var(--font-body);
          font-weight: 900;
          line-height: 1.1;
        }

        .perfil-header p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .back-link {
          color: var(--text-2);
          text-decoration: none;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-weight: 700;
          white-space: nowrap;
        }

        .profile-hero {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg2);
          padding: 20px;
        }

        .hero-main {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .profile-avatar {
          --avatar-color: var(--green);
          width: 72px;
          height: 72px;
          border-radius: 999px;
          border: 2px solid var(--avatar-color);
          box-shadow: 0 0 16px color-mix(in srgb, var(--avatar-color) 40%, transparent);
          background: color-mix(in srgb, var(--avatar-color) 18%, var(--bg3));
          color: var(--text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 800;
          font-family: var(--font-body);
          flex-shrink: 0;
        }

        .profile-avatar.tier-despertar {
          --avatar-color: var(--green);
        }

        .profile-avatar.tier-movimento {
          --avatar-color: var(--gold);
          color: var(--bg);
        }

        .profile-avatar.tier-aceleracao {
          --avatar-color: var(--blue);
        }

        .profile-avatar.tier-autogoverno {
          --avatar-color: var(--purple);
        }

        .hero-copy {
          display: grid;
          gap: 6px;
        }

        .hero-copy h2 {
          margin: 0;
          font-family: var(--font-body);
          font-size: 22px;
          font-weight: 900;
          line-height: 1.1;
          color: var(--text);
        }

        .hero-copy p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .card {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg2);
          padding: 20px;
          display: grid;
          gap: 10px;
        }

        .card h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
        }

        .helper-text {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .info-grid div {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px;
          display: grid;
          gap: 3px;
        }

        .label {
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 700;
        }

        .info-grid strong {
          font-size: 14px;
          color: var(--text);
        }

        .stack-form {
          display: grid;
          gap: 8px;
        }

        .stack-form label {
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .stack-form input {
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg3);
          color: var(--text);
          font-size: 14px;
          font-family: var(--font-body);
          padding: 12px 14px;
          outline: none;
        }

        .stack-form input:focus {
          border-color: var(--green-mid);
          box-shadow: 0 0 0 3px var(--green-dim);
        }

        .stack-form button {
          border: none;
          border-radius: 10px;
          background: var(--green);
          color: var(--bg);
          font-size: 14px;
          font-weight: 700;
          padding: 13px;
          cursor: pointer;
          transition: var(--transition);
        }

        .stack-form button:not(:disabled):hover {
          opacity: 0.9;
        }

        .stack-form button:not(:disabled):active {
          transform: scale(0.99);
        }

        .stack-form button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .feedback {
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--text-2);
        }

        .feedback.small {
          font-size: 12px;
        }

        .feedback.error {
          border-color: color-mix(in srgb, var(--red) 28%, transparent);
          background: color-mix(in srgb, var(--red) 8%, transparent);
          color: var(--red);
        }

        .feedback.success {
          border-color: color-mix(in srgb, var(--green) 35%, transparent);
          background: var(--green-dim);
          color: var(--green);
        }

        .warning-box {
          border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--gold) 8%, transparent);
          color: var(--gold);
          padding: 10px 12px;
          font-size: 13px;
        }

        .warning-box p {
          margin: 0;
        }

        .warning-box ul {
          margin: 6px 0 0;
          padding-left: 18px;
        }

        .warning-detail {
          margin-top: 6px;
          color: var(--gold);
        }

        .account-links {
          gap: 0;
          padding-top: 14px;
          padding-bottom: 8px;
        }

        .account-links h2 {
          margin-bottom: 8px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          text-decoration: none;
        }

        .menu-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .menu-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          flex: 1;
        }

        .menu-arrow {
          color: var(--muted);
          font-size: 14px;
          line-height: 1;
        }

        @media (max-width: 760px) {
          .perfil-shell {
            padding: 14px 10px calc(120px + env(safe-area-inset-bottom));
          }

          .perfil-header h1 {
            font-size: 22px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
