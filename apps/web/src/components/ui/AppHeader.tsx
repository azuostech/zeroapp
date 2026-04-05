import { Link } from 'react-router-dom';
import styles from './ui.module.css';
import { CoinDisplay } from './CoinDisplay';
import { useAuth } from '../../context/AuthContext';

export function AppHeader() {
  const { user, logout } = useAuth();
  const now = new Date();
  const dateLabel = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerIcon}>🟩</div>
        <div>
          <div className={styles.headerTitle}><Link to="/app/dashboard">ZERO</Link></div>
          <div className={styles.headerSub}>Controle Financeiro Pessoal</div>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div>{dateLabel}</div>
        <div className={styles.mesBadge}>{monthLabel}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <CoinDisplay amount={user?.coins ?? 0} />
          <button className={styles.btnDanger} onClick={logout}>Sair</button>
        </div>
      </div>
    </header>
  );
}
