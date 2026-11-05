import PortfolioPage from '@/src/modules/investments/presentation/PortfolioPage';
export default async function Page({ params }) { const { id } = await params; return <PortfolioPage adminViewUserId={id} />; }
