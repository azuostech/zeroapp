'use client';

const SIZE_MAP = {
  sm: 34,
  md: 48,
  lg: 72
};

export default function JacksonIAAvatar({ size = 'md', isLoading = false, showStatus = true }) {
  const px = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className="jackson-avatar-wrap">
      <div className={`jackson-avatar ${isLoading ? 'loading' : ''}`} style={{ width: `${px}px`, height: `${px}px` }} aria-hidden="true">
        <span>🤖</span>
      </div>

      {showStatus ? (
        <span className="online-status">
          <span className="dot" />
          Online
        </span>
      ) : null}

      <style jsx>{`
        .jackson-avatar-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .jackson-avatar {
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--green-2), #00694A);
          border: 2px solid var(--green);
          box-shadow: var(--shadow-glow);
          transition: box-shadow 0.2s ease;
          flex-shrink: 0;
        }

        .jackson-avatar.loading {
          box-shadow:
            0 0 0 2px var(--green-mid) inset,
            0 0 28px var(--green-glow);
        }

        .jackson-avatar span {
          font-size: calc(${px}px * 0.45);
          line-height: 1;
        }

        .online-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-2);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--green);
          box-shadow: 0 0 0 0 var(--green-glow);
          animation: pulse 1.6s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.45);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(0, 200, 83, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 200, 83, 0);
          }
        }
      `}</style>
    </div>
  );
}
