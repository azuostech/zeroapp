import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';

export function InvestimentosPage() {
  const investments = useApiQuery<Array<{ id: string; institution: string; type: string; amount: number }>>('investments', '/investments');

  return (
    <div>
      <h1>Investimentos</h1>
      <div className="card-grid">
        {(investments.data ?? []).map((i) => (
          <Card key={i.id}><h4>{i.institution}</h4><p>{i.type} - R$ {i.amount.toFixed(2)}</p></Card>
        ))}
      </div>
    </div>
  );
}
