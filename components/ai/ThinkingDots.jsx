'use client';

export default function ThinkingDots() {
  return (
    <span className="thinking-dots" aria-label="Jackson IA está pensando">
      <span />
      <span />
      <span />

      <style jsx>{`
        .thinking-dots {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 18px;
        }

        .thinking-dots span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--green, #00c853);
          animation: dotPulse 1s infinite ease-in-out;
        }

        .thinking-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .thinking-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes dotPulse {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </span>
  );
}
