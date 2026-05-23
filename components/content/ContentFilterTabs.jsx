'use client';

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'video', label: 'Aulas' },
  { id: 'tool', label: 'Ferramentas' },
  { id: 'pdf', label: 'PDFs' }
];

export default function ContentFilterTabs({ active = 'all', onChange }) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Filtro de conteudo">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange?.(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}

      <style jsx>{`
        .filter-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .tab-btn {
          border: 1px solid var(--conteudo-border, #2f363d);
          border-radius: 999px;
          background: var(--conteudo-card, #141619);
          color: var(--conteudo-muted, #8e98a2);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          white-space: nowrap;
          cursor: pointer;
        }

        .tab-btn.active {
          border-color: rgba(0, 200, 83, 0.45);
          color: var(--conteudo-positive, #00c853);
          background: rgba(0, 200, 83, 0.14);
        }
      `}</style>
    </div>
  );
}
