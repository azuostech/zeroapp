'use client';

export default function FeedEmpty() {
  return (
    <div className="feed-empty">
      <div className="emoji">👥</div>
      <h3>O feed ainda esta vazio</h3>
      <p>Seja o primeiro a registrar um ganho ou completar um mes!</p>

      <style jsx>{`
        .feed-empty {
          border: 1px dashed var(--turma-border, #2f363d);
          border-radius: 16px;
          padding: 24px 16px;
          text-align: center;
          background: color-mix(in srgb, var(--turma-card, #141619) 72%, transparent);
        }

        .emoji {
          font-size: 36px;
          margin-bottom: 6px;
        }

        h3 {
          margin: 0 0 4px;
          font-size: 20px;
        }

        p {
          margin: 0;
          color: var(--turma-muted, #98a0a8);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
