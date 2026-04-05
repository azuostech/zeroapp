import { GoalCard } from '../../components/app/GoalCard';
import { useApiQuery } from '../../hooks/useApiQuery';

export function MetasPage() {
  const goals = useApiQuery<Array<{ id: string; name: string; currentAmount: number; targetAmount: number }>>('goals', '/goals');

  return (
    <div>
      <h1>Metas</h1>
      <div className="card-grid">
        {(goals.data ?? []).map((goal) => <GoalCard key={goal.id} goal={goal} />)}
      </div>
    </div>
  );
}
