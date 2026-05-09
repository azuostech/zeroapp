import MAVFPage from '@/app/mavf/page';

export default function AdminUserMAVFPage({ params }) {
  return <MAVFPage adminViewUserId={params.id} adminClientLabel="visualizando MAVF do cliente" />;
}
