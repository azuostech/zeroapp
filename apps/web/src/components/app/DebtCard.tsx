import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function DebtCard({ debt }: { debt: { creditor: string; totalAmount: number; status: string } }) {
  return (
    <Card>
      <h4>{debt.creditor}</h4>
      <p>R$ {debt.totalAmount.toFixed(2)}</p>
      <Badge>{debt.status}</Badge>
    </Card>
  );
}
