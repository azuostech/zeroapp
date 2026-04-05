import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

export function GoalCard({ goal }: { goal: { name: string; currentAmount: number; targetAmount: number } }) {
  const pct = goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  return (
    <Card>
      <h4>{goal.name}</h4>
      <ProgressBar value={pct} />
      <small>{pct.toFixed(0)}%</small>
    </Card>
  );
}
