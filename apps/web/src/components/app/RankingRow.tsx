export function RankingRow({ rank, row }: { rank: number; row: { name: string; totalCoins: number; phase: string } }) {
  return (
    <tr>
      <td>#{rank}</td>
      <td>{row.name}</td>
      <td>{row.phase}</td>
      <td>🪙 {row.totalCoins}</td>
    </tr>
  );
}
