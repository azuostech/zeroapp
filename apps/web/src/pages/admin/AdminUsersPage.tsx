import { Link } from 'react-router-dom';
import { Table } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';

export function AdminUsersPage() {
  const users = useApiQuery<Array<{ id: string; name: string; email: string; tier: string; isActive: boolean }>>('admin-users', '/admin/users');

  return (
    <div>
      <h1>Usuários</h1>
      <Table>
        <thead><tr><th>Nome</th><th>Email</th><th>Tier</th><th>Status</th><th>Detalhe</th></tr></thead>
        <tbody>
          {(users.data ?? []).map((u) => (
            <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.tier}</td><td>{u.isActive ? 'Ativo' : 'Bloqueado'}</td><td><Link to={`/admin/usuarios/${u.id}`}>Abrir</Link></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
