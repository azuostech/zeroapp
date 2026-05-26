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
              color: #9fb8a7;
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
              <small>Mentor financeiro com contexto real</small>
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
          max-width: 900px;
          margin: 0 auto;
          min-height: calc(100vh - 180px);
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #eff7f2;
        }

        .chat-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          border: 1px solid #2a312d;
          border-radius: 14px;
          padding: 11px;
          background: linear-gradient(145deg, #121713, #151b17);
        }

        .back-link {
          color: #9dc7ac;
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
          line-height: 1.1;
        }

        .agent-head small {
          color: #8ca596;
          font-size: 12px;
        }

        .clear-btn {
          border: 1px solid #37533f;
          border-radius: 9px;
          background: #172119;
          color: #b8d6c3;
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
          border: 1px solid #2a312d;
          border-radius: 14px;
          background: #0e1210;
          padding: 12px;
          min-height: 360px;
          max-height: 58vh;
          overflow-y: auto;
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
          color: #9ab3a2;
          line-height: 1.5;
          max-width: 540px;
        }

        .empty-cta {
          color: #d6ebdd;
          font-weight: 700;
        }

        .history {
          display: flex;
          flex-direction: column;
        }

        .error-box {
          margin-top: 10px;
          border: 1px solid rgba(255, 112, 112, 0.45);
          background: rgba(255, 80, 80, 0.1);
          color: #ffc5c5;
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .error-box button {
          border: 1px solid rgba(255, 142, 142, 0.7);
          background: transparent;
          color: #ffd7d7;
          border-radius: 8px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 12px;
        }

        .chips-wrap {
          border: 1px solid #29332d;
          border-radius: 12px;
          padding: 8px;
          background: #121814;
        }

        .composer {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          border: 1px solid #314037;
          border-radius: 12px;
          background: #131b16;
          padding: 8px;
        }

        .composer input {
          border: 1px solid #2d3b32;
          background: #0f1511;
          color: #f2faf4;
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
        }

        .composer input::placeholder {
          color: #7f9888;
        }

        .composer input:focus {
          border-color: #00c853;
        }

        .composer button {
          min-width: 52px;
          border: 1px solid #00c853;
          border-radius: 10px;
          background: #00c853;
          color: #05170b;
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
          .chat-header {
            grid-template-columns: 1fr;
            align-items: flex-start;
          }

          .clear-btn {
            justify-self: flex-end;
          }

          .chat-area {
            max-height: 52vh;
          }

          .empty-state h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </MAVFAppShell>
  );
}
