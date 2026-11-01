'use client';

import { useEffect } from 'react';
import {
  BASIC_ACCESS_CHECKOUT_URL,
  BASIC_ACCESS_PRICE_LABEL,
  buildMentorshipWhatsappUrl
} from '@/src/lib/commerce/access-offer';
import { SHAMAR_ENABLED } from '@/src/lib/features';

export default function InterestModal({ isOpen, onClose, program }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !program) return null;

  const whatsappUrl = buildMentorshipWhatsappUrl();

  return (
    <div
      className="interest-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className="interest-sheet" role="dialog" aria-modal="true" aria-labelledby="interest-title">
        <div className="sheet-handle" />
        <div className="icon-wrap" aria-hidden="true">
          🎓
        </div>
        <h2 id="interest-title">{program.title}</h2>
        <span className="reason">{program.locked_reason || 'Conteúdo exclusivo'}</span>
        <p>
          {SHAMAR_ENABLED ? (
            <>Este é um ambiente restrito para alunos. Com o Acesso Básico, você libera a Imersão Finanças do Zero,
              ferramentas SHAMAR e comunidade por {BASIC_ACCESS_PRICE_LABEL}, pagamento único.</>
          ) : (
            <>Este é um ambiente restrito para alunos. Com o Acesso Básico, você libera a Imersão Finanças do Zero e
              participa da comunidade por {BASIC_ACCESS_PRICE_LABEL}, pagamento único.</>
          )}
        </p>
        <a href={BASIC_ACCESS_CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className="primary-cta" onClick={onClose}>
          Adquirir acesso básico
        </a>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="secondary-cta" onClick={onClose}>
          Falar sobre mentoria
        </a>
        <button type="button" className="close-button" onClick={onClose}>
          Agora não
        </button>
      </section>

      <style jsx>{`
        .interest-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: color-mix(in srgb, var(--bg) 78%, transparent);
          padding-top: 64px;
        }

        .interest-sheet {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          border: 1px solid var(--border-2);
          border-bottom: 0;
          border-radius: 24px 24px 0 0;
          background: var(--bg2);
          color: var(--text);
          padding: 0 24px calc(34px + env(safe-area-inset-bottom));
          text-align: center;
          box-shadow: var(--shadow-soft);
        }

        .sheet-handle {
          width: 42px;
          height: 4px;
          margin: 12px auto 20px;
          border-radius: var(--radius-full);
          background: var(--border-2);
        }

        .icon-wrap {
          margin-bottom: 12px;
          font-size: 46px;
          line-height: 1;
        }

        h2 {
          margin: 0;
          color: var(--text);
          font-size: 20px;
          font-weight: 900;
          line-height: 1.2;
        }

        .reason {
          display: inline-flex;
          max-width: 100%;
          margin-top: 10px;
          border: 1px solid var(--green-mid);
          border-radius: var(--radius-full);
          background: var(--green-dim);
          color: var(--green);
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.25;
        }

        p {
          margin: 16px auto 22px;
          max-width: 420px;
          color: var(--text-2);
          font-size: 14px;
          line-height: 1.65;
        }

        .primary-cta,
        .secondary-cta,
        .close-button {
          width: 100%;
          min-height: 46px;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-weight: 900;
        }

        .primary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--green-mid);
          background: var(--green);
          color: var(--bg);
          text-decoration: none;
          font-size: 15px;
        }

        .secondary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
          border: 1px solid var(--border-2);
          background: var(--bg-surface);
          color: var(--text);
          text-decoration: none;
          font-size: 14px;
        }

        .close-button {
          margin-top: 10px;
          border: 0;
          background: transparent;
          color: var(--text-2);
          cursor: pointer;
          font-size: 13px;
        }

        .primary-cta:focus-visible,
        .secondary-cta:focus-visible,
        .close-button:focus-visible {
          outline: 2px solid var(--green);
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
