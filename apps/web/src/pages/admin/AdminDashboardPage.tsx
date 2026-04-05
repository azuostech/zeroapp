import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';

export function AdminDashboardPage() {
  const metrics = useApiQuery<{ users: number; activeUsers: number; transactions: number; goals: number; debts: number; totalCoins: number }>('admin-metrics', '/admin/metrics');

  return (
    <div>
      <h1>Admin</h1>
      <div className="card-grid">
        <Card><h4>Usuários</h4><p>{metrics.data?.users ?? 0}</p></Card>
        <Card><h4>Ativos</h4><p>{metrics.data?.activeUsers ?? 0}</p></Card>
        <Card><h4>Transações</h4><p>{metrics.data?.transactions ?? 0}</p></Card>
        <Card><h4>Total Coins</h4><p>{metrics.data?.totalCoins ?? 0}</p></Card>
      </div>
    </div>
  );
}
