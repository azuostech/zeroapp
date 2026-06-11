'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import MAVFAppShell from '@/components/mavf/MAVFAppShell';
import ChatBubble from '@/components/ai/ChatBubble';
import JacksonIAAvatar from '@/components/ai/JacksonIAAvatar';
import QuickChips from '@/components/ai/QuickChips';
import MuralCard from '@/components/ai/MuralCard';
import { useJacksonIA } from '@/hooks/useJacksonIA';

function firstName(profile) {
  const name = String(profile?.full_name || '').trim();
  if (!name) return 'você';
  return name.split(' ')[0];
}

async function fetchProfile() {
  const response = await fetch('/api/profile/me', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

export default function JacksonIAPage() {
  const router = useRouter();
  const scrollRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [input, setInput] = useState('');

  const { messages, isLoading, error, sendMessage, retryLast, clearChat, regenerateMural, hasMessages } = useJacksonIA();

  const userFirstName = useMemo(() => firstName(profile), [profile]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const { response, payload } = await fetchProfile();

        if (!active) return;

        if (response.status === 401 || response.status === 403) {
          router.replace('/');
          return;
        }

        if (!response.ok) {
          throw new Error(payload?.error || 'Erro ao carregar perfil');
        }

        setProfile(payload?.profile || null);
      } catch (_) {
        if (active) {
          router.replace('/');
        }
      } finally {
        if (active) setIsProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    await sendMessage(text);
  };

  const handleChipSelect = async (message) => {
    if (isLoading) return;
    await sendMessage(message);
  };

  if (isProfileLoading) {
    return (
      <MAVFAppShell activeTab="inicio">
        <div className="loader-wrap">
          <JacksonIAAvatar size="lg" isLoading showStatus={false} />
          <p>Conectando com o Jackson IA...</p>

          <style jsx>{`
            .loader-wrap {
              min-height: 50vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 10px;
              color: var(--text-2);
            }

            p {
              margin: 0;
              font-size: 14px;
            }
          `}</style>
        </div>
      </MAVFAppShell>
    );
  }

  return (
    <MAVFAppShell activeTab="inicio">
      <section className="jackson-page">
        <header className="chat-header">
          <Link href="/app" className="back-link" aria-label="Voltar para Início">
            ← Voltar
          </Link>

          <div className="agent-head">
            <JacksonIAAvatar size="md" isLoading={isLoading} showStatus />
            <div>
              <strong>Jackson IA</strong>
              <small>● Online</small>
            </div>
          </div>

          <button type="button" className="clear-btn" onClick={clearChat} disabled={isLoading || !hasMessages}>
            Limpar
          </button>
        </header>

        <div className="chat-area" ref={scrollRef}>
          {!hasMessages ? (
            <div className="empty-state">
              <JacksonIAAvatar size="lg" isLoading={false} showStatus={false} />
              <h1>Oi, {userFirstName}! 👋</h1>
              <p>
                Sou o Jackson IA. Conheço seus dados financeiros e estou aqui para te ajudar a enxergar com clareza.
              </p>
              <span className="empty-cta">Por onde quer começar?</span>
              <QuickChips layout="grid" onSelect={handleChipSelect} disabled={isLoading} />
            </div>
          ) : (
            <div className="history">
              {messages.map((message) => {
                if (message?.type === 'mural') {
                  return <MuralCard key={message.id} mural={message.mural} onRegenerate={regenerateMural} disabled={isLoading} />;
                }

                return <ChatBubble key={message.id} message={message} />;
              })}

              {isLoading ? <ChatBubble role="assistant" isLoading message={{ content: '' }} /> : null}
            </div>
          )}

          {error ? (
            <div className="error-box" role="alert">
              <span>{error}</span>
              <button type="button" onClick={retryLast} disabled={isLoading}>
                Tentar novamente
              </button>
            </div>
          ) : null}
        </div>

        <div className="chips-wrap">
          <QuickChips onSelect={handleChipSelect} disabled={isLoading} />
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Digite sua mensagem"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isLoading}
            maxLength={1200}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? '...' : '→'}
          </button>
        </form>
      </section>

      <style jsx>{`
        .jackson-page {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          min-height: calc(100dvh - 180px);
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: var(--text);
          overflow-x: hidden;
        }

        .chat-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border-2);
          padding: 11px;
          background: color-mix(in srgb, var(--bg-deep) 92%, transparent);
        }

        .back-link {
          color: var(--text-2);
          font-size: 13px;
          text-decoration: none;
          white-space: nowrap;
        }

        .agent-head {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .agent-head strong {
          display: block;
          font-size: 16px;
          font-family: var(--font-display);
          font-weight: 700;
          line-height: 1.1;
        }

        .agent-head small {
          color: var(--green);
          font-size: 11px;
        }

        .clear-btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-sm);
          background: var(--bg-surface);
          color: var(--text-2);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 9px;
          cursor: pointer;
        }

        .clear-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .chat-area {
          background: var(--bg-deep);
          padding: 0 16px;
          min-height: 360px;
          max-height: 58vh;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .empty-state {
          min-height: 330px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          gap: 10px;
          padding: 10px;
        }

        .empty-state h1 {
          margin: 2px 0;
          font-size: 26px;
        }

        .empty-state p {
          margin: 0;
          color: var(--text-2);
          line-height: 1.5;
          max-width: 540px;
        }

        .empty-cta {
          color: var(--text);
          font-weight: 700;
        }

        .history {
          display: flex;
          flex-direction: column;
        }

        .error-box {
          margin-top: 10px;
          border: 1px solid var(--red);
          background: var(--red-dim);
          color: var(--red);
          border-radius: var(--radius-sm);
          padding: 9px 10px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .error-box button {
          border: 1px solid var(--red);
          background: transparent;
          color: var(--red);
          border-radius: 8px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 12px;
        }

        .chips-wrap {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          padding: 8px;
          background: var(--bg-card);
          min-width: 0;
          overflow: hidden;
        }

        .composer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          padding: 8px;
        }

        .composer input {
          width: 100%;
          min-width: 0;
          border: 1px solid var(--border-2);
          background: var(--bg-surface);
          color: var(--text);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          font-size: 16px;
          line-height: 1.4;
          outline: none;
        }

        .composer input::placeholder {
          color: var(--text-3);
        }

        .composer input:focus {
          border-color: var(--green-mid);
          box-shadow: 0 0 0 3px var(--green-dim);
        }

        .composer button {
          width: 52px;
          min-width: 52px;
          min-height: 44px;
          border: 1px solid var(--green-mid);
          border-radius: 999px;
          background: var(--green);
          color: #000;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 10px;
        }

        .composer button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .jackson-page {
            min-height: calc(100dvh - 142px);
          }

          .chat-header {
            grid-template-columns: 1fr;
            align-items: flex-start;
          }

          .clear-btn {
            justify-self: flex-end;
          }

          .chat-area {
            min-height: min(330px, 48dvh);
            max-height: 52dvh;
            padding-inline: 10px;
          }

          .empty-state h1 {
            font-size: 22px;
          }

          .composer {
            border-radius: 20px;
            padding: 8px;
          }

          .composer button {
            width: 48px;
            min-width: 48px;
            min-height: 48px;
          }
        }
      `}</style>
    </MAVFAppShell>
  );
}
