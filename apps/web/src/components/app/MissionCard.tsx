import { Card } from '../ui/Card';

export function MissionCard({ mission }: { mission: { name: string; description: string; coinReward: number; completed: boolean } }) {
  return (
    <Card>
      <h4>{mission.name}</h4>
      <p>{mission.description}</p>
      <p>🪙 {mission.coinReward}</p>
      <strong>{mission.completed ? 'Concluída' : 'Pendente'}</strong>
    </Card>
  );
}
