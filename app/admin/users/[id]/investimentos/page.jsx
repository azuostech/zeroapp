import InvestmentsHubPage from '@/src/modules/investments/presentation/InvestmentsHubPage';
export default async function Page({ params }) { const { id } = await params; return <InvestmentsHubPage adminViewUserId={id} />; }
