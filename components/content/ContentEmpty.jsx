'use client';

export default function ContentEmpty() {
  return (
    <div className="content-empty">
      <div className="emoji">📚</div>
      <h3>Nenhum conteudo disponivel nesta categoria ainda.</h3>

      <style jsx>{`
        .content-empty {
          border: 1px dashed var(--border);
          border-radius: 16px;
          padding: 26px 14px;
          text-align: center;
          background: color-mix(in srgb, var(--bg2) 72%, transparent);
        }

        .emoji {
          font-size: 36px;
          margin-bottom: 6px;
        }

        h3 {
          margin: 0;
          font-size: 18px;
          color: var(--muted);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
