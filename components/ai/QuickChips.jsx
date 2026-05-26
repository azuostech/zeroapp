'use client';

import { QUICK_CHIPS } from '@/hooks/useJacksonIA';

export default function QuickChips({ onSelect, disabled = false, layout = 'scroll' }) {
  return (
    <div className={`quick-chips ${layout}`}>
      {QUICK_CHIPS.map((chip) => (
        <button key={chip.id} type="button" className="chip" onClick={() => onSelect?.(chip.message)} disabled={disabled}>
          {chip.label}
        </button>
      ))}

      <style jsx>{`
        .quick-chips {
          display: flex;
          gap: 8px;
        }

        .quick-chips.scroll {
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }

        .quick-chips.grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .chip {
          border: 1px solid rgba(0, 200, 83, 0.22);
          background: var(--bg3, #1c1c1c);
          color: #d7e9dd;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 12px;
          white-space: nowrap;
          cursor: pointer;
          transition: border-color 0.18s ease, transform 0.18s ease;
        }

        .quick-chips.grid .chip {
          border-radius: 12px;
          text-align: left;
          white-space: normal;
          line-height: 1.3;
          min-height: 56px;
        }

        .chip:hover {
          border-color: rgba(0, 200, 83, 0.6);
          transform: translateY(-1px);
        }

        .chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}
