'use client';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export default function BlocoResumoStrip({ totalPrevisto = 0, totalRealizado = 0, tipo = 'gasto' }) {
  const previsto = Number(totalPrevisto || 0);
  const realizado = Number(totalRealizado || 0);

  const pct = previsto > 0 ? Math.round((realizado / previsto) * 100) : 0;
  const fill = Math.max(0, Math.min(120, pct));

  const positiveType = tipo === 'receita';
  const trackColor = positiveType ? 'rgba(0,200,83,0.18)' : 'rgba(239,68,68,0.15)';
  const fillColor = positiveType ? '#00c853' : '#ef4444';

  return (
    <div className="strip-wrap">
      <div className="strip-header">
        <span>Realizado: {formatMoney(realizado)}</span>
        <span>Previsto: {formatMoney(previsto)}</span>
        <strong>{pct}%</strong>
      </div>

      <div className="strip-track">
        <div className="strip-fill" />
      </div>

      <style jsx>{`
        .strip-wrap {
          border: 1px solid #2f2f2f;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          padding: 10px 12px;
        }

        .strip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: var(--dim, #9ea29f);
          margin-bottom: 8px;
        }

        .strip-header strong {
          color: var(--text, #f3f3f3);
          font-size: 13px;
        }

        .strip-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: ${trackColor};
        }

        .strip-fill {
          height: 100%;
          width: ${fill}%;
          background: ${fillColor};
          transition: width 0.25s ease;
        }
      `}</style>
    </div>
  );
}
