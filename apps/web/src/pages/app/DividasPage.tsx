import { DebtCard } from '../../components/app/DebtCard';
import { useApiQuery } from '../../hooks/useApiQuery';

export function DividasPage() {
  const debts = useApiQuery<Array<{ id: string; creditor: string; totalAmount: number; status: string }>>('debts', '/debts');

  return (
    <div>
      <h1>Dívidas</h1>
      <div className="card-grid">
        {(debts.data ?? []).map((d) => <DebtCard key={d.id} debt={d} />)}
      </div>
    </div>
  );
}
