import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function CodeRedeemForm({ onSubmit }: { onSubmit: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  return (
    <form
      className="form-row"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(code);
        setCode('');
      }}
    >
      <Input placeholder="Código de ingresso" value={code} onChange={(e) => setCode(e.target.value)} required />
      <Button variant="primary" type="submit">Resgatar</Button>
    </form>
  );
}
