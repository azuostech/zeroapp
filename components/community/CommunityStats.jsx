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
          <span>{item.label}</span>
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
          border: 1px solid var(--turma-border, #2f363d);
          background: var(--turma-card, #141619);
          border-radius: 999px;
          padding: 10px 14px;
          min-width: 150px;
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }

        .stat-pill strong {
          color: var(--turma-positive, #00c853);
          font-size: 16px;
          line-height: 1.1;
        }

        .stat-pill span {
          color: var(--turma-muted, #98a0a8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
      `}</style>
    </div>
  );
}
