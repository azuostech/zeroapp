import ReservePage from '@/src/modules/investments/presentation/ReservePage';
export default async function Page({ params }) { const { id } = await params; return <ReservePage adminViewUserId={id} />; }
