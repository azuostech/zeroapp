import BalancePage from '@/src/modules/patrimony/presentation/BalancePage';
export default async function Page({ params }) { const { id } = await params; return <BalancePage adminViewUserId={id} />; }
