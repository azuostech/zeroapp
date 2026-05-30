'use client';

export default function FeedEmpty({
  title = 'O feed ainda esta vazio',
  description = 'Seja o primeiro a registrar um ganho ou completar um mes!'
}) {
  return (
    <div className="feed-empty">
      <div className="emoji">👥</div>
      <h3>{title}</h3>
      <p>{description}</p>

      <style jsx>{`
        .feed-empty {
          border: 1px dashed var(--border);
          border-radius: 16px;
          padding: 24px 16px;
          text-align: center;
          background: color-mix(in srgb, var(--bg2) 72%, transparent);
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
          color: var(--muted);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
