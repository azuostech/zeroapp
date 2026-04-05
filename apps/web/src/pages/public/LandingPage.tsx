import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function LandingPage() {
  return (
    <div className="container" style={{ padding: '3rem 0' }}>
      <section style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#00C853', fontSize: '3rem' }}>ZERO</h1>
        <p>Comece a controlar suas finanças do zero.</p>
        <p style={{ color: '#888', marginBottom: 16 }}>O app que recompensa sua disciplina financeira.</p>
        <Link to="/cadastro"><Button variant="primary">Criar conta grátis</Button></Link>
        <Link to="/resgatar" style={{ marginLeft: 12 }}><Button variant="secondary">Já tenho código de ingresso</Button></Link>
      </section>

      <section className="card-grid">
        <Card><h3>Dashboard</h3><p>Visão completa do mês</p></Card>
        <Card><h3>Gamificação</h3><p>Ganhe ZeroCoins por progresso</p></Card>
        <Card><h3>Jornada do Herói</h3><p>Suba de fase com consistência</p></Card>
        <Card><h3>Relatórios</h3><p>Acompanhe metas e evolução</p></Card>
      </section>

      <section className="section card-grid">
        <Card><h3>Bombeiro</h3><p>0-200 coins</p></Card>
        <Card><h3>Sobrevivente</h3><p>201-800 coins</p></Card>
        <Card><h3>Construtor</h3><p>801-2000 coins</p></Card>
        <Card><h3>Multiplicador</h3><p>2001+ coins</p></Card>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h3>Pronto para começar do zero?</h3>
        <Link to="/cadastro"><Button>Criar conta grátis</Button></Link>
      </section>

      <footer style={{ marginTop: 40, color: '#888' }}>
        © ZERO — Controle Financeiro Pessoal · Jackson Souza · @jacksonsouzarc · @jackson.autogoverno
      </footer>
    </div>
  );
}
