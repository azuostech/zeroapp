import ActionPlanPage from '@/src/modules/patrimony/presentation/ActionPlanPage';
export default async function Page({ params }) { const { id } = await params; return <ActionPlanPage adminViewUserId={id} />; }
