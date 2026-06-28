'use client';

import { useEffect } from 'react';
import {
  BASIC_ACCESS_CHECKOUT_URL,
  BASIC_ACCESS_PRICE_LABEL,
  buildMentorshipWhatsappUrl
} from '@/src/lib/commerce/access-offer';

export default function RestrictedAccessModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mentorshipUrl = buildMentorshipWhatsappUrl();

  return (
    <div
      className="restricted-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className="restricted-sheet" role="dialog" aria-modal="true" aria-labelledby="restricted-title">
        <div className="sheet-handle" />
        <div className="lock-icon" aria-hidden="true">🔒</div>
        <p className="eyebrow">Ambiente restrito para alunos</p>
        <h2 id="restricted-title">Libere sua jornada no ZeroApp</h2>
        <p className="intro">
          Este espaço é exclusivo para alunos. Com o Acesso Básico, você entra na Imersão Finanças do Zero,
          libera ferramentas SHAMAR e participa da comunidade por {BASIC_ACCESS_PRICE_LABEL}, pagamento único.
        </p>

        <div className="actions">
          <a href={BASIC_ACCESS_CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className="primary-cta" onClick={onClose}>
            Adquirir acesso básico
          </a>
          <a href={mentorshipUrl} target="_blank" rel="noopener noreferrer" className="secondary-cta" onClick={onClose}>
            Falar sobre mentoria
          </a>
        </div>

        <button type="button" className="close-button" onClick={onClose}>
          Agora não
        </button>
      </section>

      <style jsx>{`
        .restricted-overlay {
          position: fixed;
          inset: 0;
          z-index: 360;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background: color-mix(in srgb, var(--bg) 78%, transparent);
          padding-top: 64px;
        }

        .restricted-sheet {
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
          margin: 12px auto 18px;
          border-radius: var(--radius-full);
          background: var(--border-2);
        }

        .lock-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          margin: 0 auto 14px;
          border: 1px solid var(--green-mid);
          border-radius: 50%;
          background: var(--green-dim);
          font-size: 30px;
          line-height: 1;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: var(--green);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          line-height: 1.25;
          text-transform: uppercase;
        }

        h2 {
          margin: 0;
          color: var(--text);
          font-size: 21px;
          font-weight: 900;
          line-height: 1.2;
        }

        .intro {
          margin: 14px auto 22px;
          max-width: 440px;
          color: var(--text-2);
          font-size: 14px;
          line-height: 1.65;
        }

        .actions {
          display: grid;
          gap: 10px;
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

        .primary-cta,
        .secondary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 14px;
        }

        .primary-cta {
          border: 1px solid var(--green-mid);
          background: var(--green);
          color: var(--bg);
        }

        .secondary-cta {
          border: 1px solid var(--border-2);
          background: var(--bg-surface);
          color: var(--text);
        }

        .close-button {
          margin-top: 8px;
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

        @media (min-width: 640px) {
          .restricted-overlay {
            justify-content: center;
            padding: 24px;
          }

          .restricted-sheet {
            border-bottom: 1px solid var(--border-2);
            border-radius: 22px;
            padding-bottom: 30px;
          }
        }
      `}</style>
    </div>
  );
}
