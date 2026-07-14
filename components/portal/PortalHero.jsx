import Link from 'next/link';
import styles from './portal.module.css';

export default function PortalHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <span className={styles.heroPill}>Portal educacional gratuito</span>
        <h1>Aprenda finanças do zero, no seu ritmo</h1>
        <p>Conteúdo prático baseado no método Lucro Primeiro. Acesso gratuito para começar agora.</p>
        <div className={styles.heroActions}>
          <Link href="/?tab=signup" className={styles.heroPrimary}>Criar conta gratuita</Link>
          <Link href="/?tab=login" className={styles.heroSecondary}>Já tem conta? Entrar</Link>
        </div>
      </div>
    </section>
  );
}
