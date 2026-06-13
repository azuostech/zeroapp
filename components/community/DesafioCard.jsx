'use client';

function daysLeft(endsAt) {
  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

export default function DesafioCard({ challenge, participations = 0, progressPct = 0, userParticipated = false, onParticipate }) {
  if (!challenge) {
    return (
      <div className="challenge-empty">Nenhum desafio esta semana - fique ligado!</div>
    );
  }

  const pct = Math.max(0, Math.min(100, Number(progressPct || 0)));
  const left = daysLeft(challenge.ends_at);

  return (
    <section className="challenge-card">
      <div className="challenge-top">
        <span className="challenge-icon">⚡</span>
        <strong>{challenge.title}</strong>
      </div>

      <p>{challenge.descricao}</p>

      <div className="challenge-progress-track progress-track" aria-hidden="true">
        <div className="challenge-progress-fill progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="challenge-meta">
        <span>{participations}/{Number(challenge.meta || 0)} participantes</span>
        <span>
          {left === null ? 'Periodo em andamento' : `${left} dia(s) restantes`} · Meta: +{Number(challenge.coins_bonus || 0)} 🪙
        </span>
      </div>

      {userParticipated ? <div className="challenge-done">✓ Voce participou</div> : null}
      {!userParticipated ? (
        <button type="button" className="challenge-btn" onClick={() => onParticipate?.(challenge.id)} disabled={!onParticipate}>
          Participar
        </button>
      ) : null}

      <style jsx>{`
        .challenge-empty {
          border: 1px dashed var(--border-3);
          border-radius: var(--radius-lg);
          padding: 12px 14px;
          color: var(--text-2);
          background: color-mix(in srgb, var(--bg-card) 72%, transparent);
        }

        .challenge-card {
          border: 1px solid var(--green-mid);
          border-radius: 16px;
          background: var(--green-dim);
          padding: 14px;
          box-shadow: var(--shadow-sm);
        }

        .challenge-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .challenge-icon {
          font-size: 18px;
        }

        .challenge-top strong {
          color: var(--green-dark);
          font-size: 18px;
          font-weight: 700;
          line-height: 1.15;
        }

        p {
          margin: 0 0 10px;
          color: var(--text-2);
          font-size: 14px;
        }

        .challenge-progress-track {
          height: 5px;
          background: var(--green-mid);
        }

        .challenge-progress-fill {
          background: var(--green);
          box-shadow: 0 0 8px color-mix(in srgb, var(--green) 40%, transparent);
        }

        .challenge-meta {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        .challenge-done {
          margin-top: 10px;
          display: inline-flex;
          padding: 5px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--green-mid);
          color: var(--green-dark);
          background: var(--green-dim);
          font-size: 12px;
          font-weight: 700;
        }

        .challenge-btn {
          margin-top: 10px;
          border: 1px solid var(--green-mid);
          border-radius: var(--radius-md);
          background: var(--green);
          color: var(--text-on-green);
          font-size: 13px;
          font-weight: 700;
          padding: 8px 12px;
          cursor: pointer;
        }

        .challenge-btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
      `}</style>
    </section>
  );
}
