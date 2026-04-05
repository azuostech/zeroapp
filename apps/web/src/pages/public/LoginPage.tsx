import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <Card>
        <h2>Login</h2>
        <form
          className="form-row"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await login(email, password);
              navigate('/app/dashboard');
            } catch {
              setError('Falha no login');
            }
          }}
        >
          <Input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary">Entrar</Button>
        </form>
        <Button style={{ marginTop: 8 }} onClick={() => setError('Google OAuth pode ser ligado no backend')}>Entrar com Google</Button>
        {error && <p style={{ color: '#FF5252' }}>{error}</p>}
        <Link to="/cadastro">Criar conta</Link>
      </Card>
    </div>
  );
}
