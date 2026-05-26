'use client';

export default function MuralCard({ mural, onRegenerate, disabled = false }) {
  if (!mural?.image_url) return null;

  const dreamText = String(mural?.sonho_original || '').trim();

  return (
    <article className="mural-card">
      <div className="mural-header">
        <span className="emoji">🖼️</span>
        <div>
          <strong>Mural dos seus sonhos</strong>
          <small>{mural?.query ? `Query: ${mural.query}` : 'Imagem inspiradora gerada'}</small>
        </div>
      </div>

      <img src={mural.image_url} alt={dreamText ? `Mural: ${dreamText}` : 'Mural de sonho financeiro'} loading="lazy" />

      <div className="actions">
        <a href={mural.image_url} target="_blank" rel="noreferrer" download className="save-btn">
          💾 Salvar imagem
        </a>

        <button type="button" className="regen-btn" disabled={disabled} onClick={() => onRegenerate?.(dreamText)}>
          🔄 Gerar outro
        </button>
      </div>

      <style jsx>{`
        .mural-card {
          border: 1px solid rgba(0, 200, 83, 0.3);
          border-radius: 14px;
          padding: 11px;
          background: linear-gradient(180deg, #121a15, #101410);
          margin: 6px 0 4px;
        }

        .mural-header {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .emoji {
          font-size: 20px;
        }

        strong {
          display: block;
          color: #e7f5eb;
          font-size: 14px;
          line-height: 1.2;
        }

        small {
          color: #8bb89a;
          font-size: 11px;
        }

        img {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(0, 200, 83, 0.2);
          display: block;
          object-fit: cover;
          max-height: 310px;
        }

        .actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .save-btn,
        .regen-btn {
          border-radius: 9px;
          border: 1px solid rgba(0, 200, 83, 0.38);
          background: rgba(0, 200, 83, 0.1);
          color: #bbf5cf;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .regen-btn {
          background: transparent;
        }

        .regen-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </article>
  );
}
