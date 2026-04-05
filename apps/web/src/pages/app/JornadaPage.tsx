import { MissionCard } from '../../components/app/MissionCard';
import { CoinDisplay } from '../../components/ui/CoinDisplay';
import { PhaseChip } from '../../components/ui/PhaseChip';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';

export function JornadaPage() {
  const { user } = useAuth();
  const missions = useApiQuery<Array<{ id: string; name: string; description: string; coinReward: number; completed: boolean }>>('missions', '/missions');

  return (
    <div>
      <h1>Jornada do Herói</h1>
      <p><PhaseChip phase={user?.phase ?? 'BOMBEIRO'} /> <CoinDisplay amount={user?.coins ?? 0} /></p>
      <div className="card-grid">
        {(missions.data ?? []).map((m) => <MissionCard key={m.id} mission={m} />)}
      </div>
    </div>
  );
}
