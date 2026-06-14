'use client';

import { useEffect, useRef } from 'react';
import MuralCard from '@/components/ai/MuralCard';
import { QUICK_CHIPS, useJacksonIA } from '@/hooks/useJacksonIA';

export default function JacksonAIModal({ isOpen, onClose }) {
  const { messages, isLoading, error, sendMessage, regenerateMural } = useJacksonIA();
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const root = document.documentElement;
    const viewport = window.visualViewport;

    const syncViewport = () => {
      const height = viewport?.height || window.innerHeight;
      const offsetTop = viewport?.offsetTop || 0;
      root.style.setProperty('--ia-visual-height', `${height}px`);
      root.style.setProperty('--ia-visual-offset-top', `${offsetTop}px`);
    };

    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);

    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      root.style.removeProperty('--ia-visual-height');
      root.style.removeProperty('--ia-visual-offset-top');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = inputRef.current?.value?.trim();
    if (!text || isLoading) return;

    inputRef.current.value = '';
    await sendMessage(text);
  };

  const handleKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="ia-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
        role="presentation"
      >
        <section className="ia-sheet" role="dialog" aria-label="Jackson IA" aria-modal="true">
          <div className="ia-handle" />

          <header className="ia-header">
            <div className="ia-avatar">🤖</div>
            <div className="ia-meta">
              <div className="ia-name">Jackson IA</div>
              <div className="ia-status">● Online agora</div>
            </div>
            <button type="button" className="ia-close" onClick={onClose} aria-label="Fechar modal da IA">
              ✕
            </button>
          </header>

          <div className="ia-chips">
            {QUICK_CHIPS.map((chip) => (
              <button key={chip.id} type="button" className="ia-chip" onClick={() => sendMessage(chip.message)} disabled={isLoading}>
                {chip.label}
              </button>
            ))}
          </div>

          <div className="ia-chat" ref={chatRef}>
            {messages.length === 0 ? (
              <div className="ia-empty">
                <p>Oi! Conheço seus dados financeiros e estou aqui para ajudar. Por onde quer começar?</p>
              </div>
            ) : null}

            {messages.map((message, index) => {
              if (message?.type === 'mural') {
                return (
                  <MuralCard
                    key={message.id || `mural-${index}`}
                    mural={message.mural}
                    onRegenerate={regenerateMural}
                    disabled={isLoading}
                  />
                );
              }

              const isUser = message.role === 'user';
              return (
                <div key={message.id || `${message.role}-${index}`} className={`ia-message ${isUser ? 'user' : 'assistant'}`}>
                  {!isUser ? <div className="msg-avatar">🤖</div> : null}
                  <div className={`ia-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>{message.content}</div>
                </div>
              );
            })}

            {isLoading ? (
              <div className="ia-message assistant">
                <div className="msg-avatar">🤖</div>
                <div className="ia-bubble bubble-ai">
                  <span className="thinking">●●●</span>
                </div>
              </div>
            ) : null}

            {error ? <div className="ia-error">{error}</div> : null}
          </div>

          <div className="ia-input-wrap">
            <input
              ref={inputRef}
              className="ia-input"
              type="text"
              placeholder="Pergunte ao Jackson IA..."
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={1200}
            />
            <button type="button" className="ia-send" onClick={handleSend} disabled={isLoading}>
              →
            </button>
          </div>
        </section>
      </div>

      <style>{styles}</style>
    </>
  );
}

const styles = `
  .ia-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: var(--ia-visual-height, 100dvh);
    background: rgba(0, 0, 0, 0.5);
    z-index: 200;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
    transform: translateY(var(--ia-visual-offset-top, 0px));
  }

  .ia-sheet {
    width: min(100%, 720px);
    max-width: 100%;
    min-width: 0;
    margin: 0 auto;
    background: var(--bg-card);
    border-radius: 24px 24px 0 0;
    border-top: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    height: min(75vh, calc(var(--ia-visual-height, 100dvh) - 8px));
    max-height: calc(var(--ia-visual-height, 100dvh) - 8px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: max(12px, env(safe-area-inset-bottom, 22px));
  }

  .ia-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 12px auto 0;
    flex-shrink: 0;
  }

  .ia-header {
    padding: 14px 20px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-header);
    border-bottom: 1px solid var(--green-dark);
    flex-shrink: 0;
  }

  .ia-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: none;
    flex-shrink: 0;
  }

  .ia-meta {
    min-width: 0;
  }

  .ia-name {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-on-green);
  }

  .ia-status {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.78);
  }

  .ia-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    min-height: unset;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.2);
    color: var(--text-on-green);
    cursor: pointer;
  }

  .ia-chips {
    display: flex;
    gap: 7px;
    padding: 10px 20px;
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .ia-chip {
    min-height: unset;
    border-radius: 20px;
    border: 1px solid var(--border-green);
    background: var(--bg-input);
    color: var(--green-dark);
    font-family: var(--font-body);
    font-size: 11px;
    white-space: nowrap;
    padding: 7px 12px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .ia-chip:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .ia-chat {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px 20px;
  }

  .ia-empty {
    padding: 20px 0;
    text-align: center;
  }

  .ia-empty p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .ia-message {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .ia-message.user {
    justify-content: flex-end;
  }

  .msg-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--green);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }

  .ia-bubble {
    max-width: 82%;
    padding: 10px 13px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bubble-ai {
    border: 1px solid var(--border);
    background: var(--bg-input);
    color: var(--text);
    border-top-left-radius: 3px;
  }

  .bubble-user {
    background: var(--green);
    color: var(--text-on-green);
    font-weight: 600;
    border-top-right-radius: 3px;
  }

  .thinking {
    color: var(--green);
    font-size: 18px;
    letter-spacing: 3px;
  }

  .ia-error {
    font-size: 13px;
    color: var(--red);
    text-align: center;
    padding: 8px 0;
  }

  .ia-input-wrap {
    margin: 0 20px;
    width: calc(100% - 40px);
    max-width: calc(100% - 40px);
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg-card);
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    flex-shrink: 0;
  }

  .ia-input {
    flex: 1;
    width: 100%;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.4;
  }

  .ia-send {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    min-height: unset;
    border-radius: 50%;
    border: none;
    background: var(--green);
    color: var(--text-on-green);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .ia-send:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    .ia-sheet {
      border-radius: 20px 20px 0 0;
      height: min(78vh, calc(var(--ia-visual-height, 100dvh) - 6px));
      max-height: calc(var(--ia-visual-height, 100dvh) - 6px);
    }

    .ia-header {
      padding-inline: 14px;
    }

    .ia-chips {
      padding-inline: 14px;
    }

    .ia-chat {
      padding-inline: 14px;
    }

    .ia-input-wrap {
      margin-inline: 14px;
      width: calc(100% - 28px);
      max-width: calc(100% - 28px);
      padding: 9px 10px 9px 14px;
    }
  }
`;
