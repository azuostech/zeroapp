import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { TransactionForm } from '../../components/app/TransactionForm';
import { DonutChart } from '../../components/app/DonutChart';
import { MonthSelector } from '../../components/app/MonthSelector';
import { Card } from '../../components/ui/Card';
import { useApiQuery } from '../../hooks/useApiQuery';

export function DashboardPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const queryClient = useQueryClient();
  const summary = useApiQuery<{ entradas: number; saidas: number; saldo: number }>('summary', `/transactions/summary/${month}`);

  return (
    <div>
      <h1>Dashboard</h1>
      <MonthSelector value={month} onChange={setMonth} />
      <div className="card-grid section">
        <Card><h3>Entradas</h3><p>R$ {summary.data?.entradas?.toFixed(2) ?? '0.00'}</p></Card>
        <Card><h3>Saídas</h3><p>R$ {summary.data?.saidas?.toFixed(2) ?? '0.00'}</p></Card>
        <Card><h3>Saldo</h3><p>R$ {summary.data?.saldo?.toFixed(2) ?? '0.00'}</p></Card>
        <Card><DonutChart percent={summary.data ? (summary.data.saidas / Math.max(summary.data.entradas, 1)) * 100 : 0} /></Card>
      </div>

      <div className="section">
        <h3>Novo lançamento</h3>
        <TransactionForm
          onSubmit={async (payload) => {
            await api.post('/transactions', payload);
            await queryClient.invalidateQueries({ queryKey: ['summary'] });
          }}
        />
      </div>
    </div>
  );
}
