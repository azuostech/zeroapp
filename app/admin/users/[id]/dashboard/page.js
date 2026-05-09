import FinanceAppPage from '@/src/modules/finance/presentation/finance-app-page';

export default function AdminUserDashboardPage({ params }) {
  return <FinanceAppPage adminViewUserId={params.id} />;
}
