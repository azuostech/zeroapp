import { useState } from 'react';
import { api } from '../../api/client';
import { CodeRedeemForm } from '../../components/app/CodeRedeemForm';
import { Card } from '../../components/ui/Card';

export function ResgatarPage() {
  const [message, setMessage] = useState('');

  return (
    <div>
      <h1>Resgatar Código</h1>
      <Card>
        <CodeRedeemForm
          onSubmit={async (code) => {
            const { data } = await api.post('/redeem', { code });
            setMessage(`Camada: ${data.tier} | Bônus: ${data.bonus}`);
          }}
        />
        {message && <p>{message}</p>}
      </Card>
    </div>
  );
}
