import MAVFHistoricoPage from '@/app/mavf/historico/page';

export default function AdminUserMAVFHistoricoPage({ params }) {
  return <MAVFHistoricoPage adminViewUserId={params.id} adminClientLabel="histórico MAVF do cliente" />;
}
