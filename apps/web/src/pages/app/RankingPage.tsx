import { RankingRow } from '../../components/app/RankingRow';
import { Table } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';

export function RankingPage() {
  const ranking = useApiQuery<Array<{ id: string; name: string; phase: string; totalCoins: number }>>('ranking', '/ranking');

  return (
    <div>
      <h1>Ranking</h1>
      <Table>
        <thead>
          <tr><th>#</th><th>Nome</th><th>Fase</th><th>Coins</th></tr>
        </thead>
        <tbody>
          {(ranking.data ?? []).map((row, idx) => <RankingRow key={row.id} rank={idx + 1} row={row} />)}
        </tbody>
      </Table>
    </div>
  );
}
