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
            className={`tab-btn badge ${isActive ? 'badge-green active' : 'badge-neutral'}`}
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
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          white-space: nowrap;
          cursor: pointer;
          transition: var(--transition);
        }

        .tab-btn.active {
          border-color: var(--green-mid);
          color: var(--green);
          background: var(--green-dim);
        }
      `}</style>
    </div>
  );
}
