import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';

export function AdminUserDetailPage() {
  const { id } = useParams();
  const user = useApiQuery<any>('admin-user', `/admin/users/${id}`);

  return (
    <div>
      <h1>Detalhe do Usuário</h1>
      <Card><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(user.data ?? {}, null, 2)}</pre></Card>
    </div>
  );
}
