import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <Card>
        <h2>Cadastro</h2>
        <form
          className="form-row"
          onSubmit={async (e) => {
            e.preventDefault();
            await register(name, email, password);
            navigate('/app/dashboard');
          }}
        >
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary">Criar conta</Button>
        </form>
        <Link to="/login">Já tenho conta</Link>
      </Card>
    </div>
  );
}
