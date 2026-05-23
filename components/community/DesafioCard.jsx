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

      <div className="challenge-progress-track" aria-hidden="true">
        <div className="challenge-progress-fill" style={{ width: `${pct}%` }} />
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
          border: 1px dashed var(--turma-border, #2f363d);
          border-radius: 14px;
          padding: 12px 14px;
          color: var(--turma-muted, #98a0a8);
          background: color-mix(in srgb, var(--turma-card, #141619) 72%, transparent);
        }

        .challenge-card {
          border: 1px solid rgba(255, 184, 0, 0.35);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255, 184, 0, 0.11), rgba(12, 12, 12, 0.36));
          padding: 14px;
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
          font-size: 18px;
          line-height: 1.15;
        }

        p {
          margin: 0 0 10px;
          color: var(--turma-muted, #98a0a8);
          font-size: 14px;
        }

        .challenge-progress-track {
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.12);
        }

        .challenge-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #00c853);
        }

        .challenge-meta {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
          color: var(--turma-muted, #98a0a8);
        }

        .challenge-done {
          margin-top: 10px;
          display: inline-flex;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 200, 83, 0.35);
          color: var(--turma-positive, #00c853);
          font-size: 12px;
          font-weight: 700;
        }

        .challenge-btn {
          margin-top: 10px;
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 10px;
          background: rgba(255, 215, 0, 0.16);
          color: var(--turma-text, #f3f3f3);
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
