'use client';

import {
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { useShamarMissions } from '@/hooks/useShamarMissions';

function MissionItem({ mission }) {
  const progress = Math.max(0, Math.min(100, Number(mission.progress_pct || 0)));

  return (
    <div className={`mission-item${mission.completed ? ' completed' : ''}`}>
      <div className="mission-icon">{mission.icon || '🎯'}</div>
      <div className="mission-info">
        <strong>{mission.title}</strong>
        <p>{mission.description}</p>
        <div className="mission-track">
          <div className="mission-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mission-side">
        <span>+{mission.points_reward} pts</span>
        {mission.completed ? <b>✓</b> : null}
      </div>
    </div>
  );
}

export default function ShamarMissionsPage() {
  const { season, config, locked, unlockProgress, error, isLoading } = useShamar();
  const { missions, stats, isLoading: missionsLoading } = useShamarMissions(season?.id);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  const weeklyMissions = missions.filter((mission) => mission.recurrence === 'weekly' || mission.progress_pct > 0);
  const monthlyMissions = missions.filter((mission) => !weeklyMissions.includes(mission));

  return (
    <ShamarShell activeTab="missoes">
      <ShamarHeader
        label={`Turma ${config?.turma || 'SHAMAR'}`}
        title="🎯 Missões"
        subtitle="Complete missões e ganhe Pontos SHAMAR"
        stats={[
          { label: 'Concluídas', value: Number(stats?.completed || 0) },
          { label: 'Em andamento', value: Number(stats?.active || 0) },
          { label: 'Pontos', value: Number(stats?.points_earned || 0) }
        ]}
      />

      <ShamarCard title="Ativas esta semana">
        {missionsLoading ? <p className="mission-muted">Carregando missões...</p> : null}
        {!missionsLoading && weeklyMissions.length === 0 ? <p className="mission-muted">Nenhuma missão semanal ativa.</p> : null}
        {weeklyMissions.map((mission) => <MissionItem key={mission.id} mission={mission} />)}
      </ShamarCard>

      <ShamarCard title="Missões do mês">
        {!missionsLoading && monthlyMissions.length === 0 ? <p className="mission-muted">Nenhuma missão mensal ativa.</p> : null}
        {monthlyMissions.map((mission) => <MissionItem key={mission.id} mission={mission} />)}
      </ShamarCard>

      <style jsx>{`
        .mission-item {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: start;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding: 12px 0;
        }

        .mission-item:first-child {
          padding-top: 0;
        }

        .mission-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .mission-item.completed {
          opacity: 0.65;
        }

        .mission-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--shamar-dim);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .mission-info strong {
          display: block;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 2px;
        }

        .mission-info p,
        .mission-muted {
          margin: 0;
          color: var(--text2);
          font-size: 12px;
          line-height: 1.5;
        }

        .mission-track {
          height: 5px;
          border-radius: var(--radius-full);
          background: #eee;
          overflow: hidden;
          margin-top: 9px;
        }

        .mission-fill {
          height: 100%;
          border-radius: var(--radius-full);
          background: var(--shamar-dark);
        }

        .mission-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .mission-side span {
          border: 1px solid var(--gold-mid);
          background: var(--shamar-gold-dim);
          color: var(--gold-dark);
          border-radius: 8px;
          padding: 4px 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .mission-side b {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--shamar-dark);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </ShamarShell>
  );
}
