import CalendarPage from '@/src/modules/investments/presentation/CalendarPage';
export default async function Page({ params }) { const { id } = await params; return <CalendarPage adminViewUserId={id} />; }
