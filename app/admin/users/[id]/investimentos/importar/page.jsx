import B3ImportPage from '@/src/modules/investments/presentation/B3ImportPage';
export default async function Page({ params }) { const { id } = await params; return <B3ImportPage adminViewUserId={id} />; }
