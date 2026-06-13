'use client';

import { useEffect } from 'react';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

function buildWhatsappUrl(program, whatsappNumber) {
  const sanitizedNumber = String(whatsappNumber || '').replace(/\D/g, '');
  const message = encodeURIComponent(
    `Olá Jackson! Vi o programa "${program?.title || 'exclusivo'}" no ZeroApp e tenho interesse. Pode me contar mais?`
  );

  return sanitizedNumber ? `https://wa.me/${sanitizedNumber}?text=${message}` : `https://wa.me/?text=${message}`;
}

export default function InterestModal({ isOpen, onClose, program, whatsappNumber = WHATSAPP_NUMBER }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !program) return null;

  const whatsappUrl = buildWhatsappUrl(program, whatsappNumber);

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
          Esse conteúdo faz parte de um programa exclusivo para mentorados. Se quiser saber como participar, fala com a gente pelo
          WhatsApp.
        </p>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="primary-cta" onClick={onClose}>
          💬 {program.interest_cta || 'Quero saber mais'}
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

        .close-button {
          margin-top: 10px;
          border: 0;
          background: transparent;
          color: var(--text-2);
          cursor: pointer;
          font-size: 13px;
        }

        .primary-cta:focus-visible,
        .close-button:focus-visible {
          outline: 2px solid var(--green);
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
