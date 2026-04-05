import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';

export function EntradasPage() {
  const month = new Date().toISOString().slice(0, 7);
  const transactions = useApiQuery<Array<{ id: string; description: string; amount: number; type: string }>>('tx-entradas', `/transactions?month=${month}`);

  return (
    <div>
      <h1>Entradas</h1>
      <div className="card-grid">
        {(transactions.data ?? []).filter((t) => t.type === 'ENTRADA').map((t) => (
          <Card key={t.id}><strong>{t.description}</strong><p>R$ {t.amount.toFixed(2)}</p></Card>
        ))}
      </div>
    </div>
  );
}
