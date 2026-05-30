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
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 200;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .ia-sheet {
    background: var(--bg2);
    border-radius: 24px 24px 0 0;
    border-top: 1px solid var(--border);
    height: 75vh;
    display: flex;
    flex-direction: column;
    padding-bottom: env(safe-area-inset-bottom, 22px);
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
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .ia-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--green), #00694a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 0 12px var(--green-glow);
    flex-shrink: 0;
  }

  .ia-meta {
    min-width: 0;
  }

  .ia-name {
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
  }

  .ia-status {
    font-size: 11px;
    color: var(--green);
  }

  .ia-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    min-height: unset;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--muted);
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
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--muted);
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
    background: linear-gradient(135deg, var(--green), #00694a);
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
    background: var(--bg3);
    color: var(--text);
    border-top-left-radius: 3px;
  }

  .bubble-user {
    background: var(--green);
    color: #000000;
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
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--bg3);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    flex-shrink: 0;
  }

  .ia-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 13px;
  }

  .ia-send {
    width: 32px;
    height: 32px;
    min-height: unset;
    border-radius: 50%;
    border: none;
    background: var(--green);
    color: #000000;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .ia-send:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
