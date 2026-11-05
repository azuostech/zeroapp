import PositionDetailPage from '@/src/modules/investments/presentation/PositionDetailPage';
export default async function Page({ params }) { const { id, positionId } = await params; return <PositionDetailPage id={positionId} adminViewUserId={id} />; }
