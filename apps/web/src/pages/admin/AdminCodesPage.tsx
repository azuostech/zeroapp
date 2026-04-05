import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApiQuery';

export function AdminCodesPage() {
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();
  const codes = useApiQuery<Array<{ id: string; code: string; tier: string; coinBonus: number; usedBy?: string }>>('admin-codes', '/admin/codes');

  return (
    <div>
      <h1>Códigos</h1>
      <form
        className="form-row"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post('/admin/codes', { code, tier: 'MOVIMENTO', coinBonus: 500 });
          setCode('');
          await queryClient.invalidateQueries({ queryKey: ['admin-codes'] });
        }}
      >
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NOVO-CODIGO" required />
        <Button variant="primary" type="submit">Gerar</Button>
      </form>
      <Table>
        <thead><tr><th>Código</th><th>Tier</th><th>Bônus</th><th>Status</th></tr></thead>
        <tbody>
          {(codes.data ?? []).map((c) => (
            <tr key={c.id}><td>{c.code}</td><td>{c.tier}</td><td>{c.coinBonus}</td><td>{c.usedBy ? 'Usado' : 'Livre'}</td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
