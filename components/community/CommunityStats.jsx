'use client';

function formatCompact(value) {
  const amount = Number(value || 0);
  if (amount >= 1000) {
    return `${(amount / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  }
  return amount.toLocaleString('pt-BR');
}

export default function CommunityStats({ stats }) {
  const safe = stats || {};

  const items = [
    { label: 'Ativos hoje', value: Number(safe.ativos_hoje || 0) },
    { label: 'Membros', value: Number(safe.total_membros || 0) },
    { label: 'Completaram', value: `${Number(safe.completaram_mes || 0)} no mes` },
    { label: 'Coins', value: `${formatCompact(safe.coins_gerados)} 🪙` }
  ];

  return (
    <div className="stats-strip" role="list" aria-label="Estatisticas da turma">
      {items.map((item) => (
        <div key={item.label} className="stat-pill" role="listitem">
          <strong>{item.value}</strong>
          <span className="text-label">{item.label}</span>
        </div>
      ))}

      <style jsx>{`
        .stats-strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .stat-pill {
          border: 1px solid var(--border-2);
          background: var(--bg-elevated);
          border-radius: var(--radius-full);
          padding: 10px 14px;
          min-width: 150px;
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }

        .stat-pill strong {
          color: var(--green);
          font-size: 16px;
          line-height: 1.1;
          font-family: var(--font-mono);
        }

        .stat-pill span {
          color: var(--text-3);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
