import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export function TransactionForm({ onSubmit }: { onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [type, setType] = useState('ENTRADA');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <form
      className="form-row"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ type, description, category, amount: Number(amount), date });
        setDescription('');
        setCategory('');
        setAmount('');
      }}
    >
      <Select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="ENTRADA">Entrada</option>
        <option value="SAIDA">Saída</option>
      </Select>
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" required />
      <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria" required />
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" type="number" step="0.01" required />
      <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" required />
      <Button variant="primary" type="submit">Salvar</Button>
    </form>
  );
}
