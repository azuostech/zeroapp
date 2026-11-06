import PolicyPage from '@/src/modules/investments/presentation/PolicyPage';
export default async function Page({ params }) { const { id } = await params; return <PolicyPage adminViewUserId={id} />; }
