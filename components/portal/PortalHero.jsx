import Link from 'next/link';
import styles from './portal.module.css';

export default function PortalHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <span className={styles.heroPill}>Portal educacional gratuito</span>
        <h1>
          <span className={styles.heroHeadlineLight}>Aprenda Finanças do Zero,</span>
          <span className={styles.heroHeadlineAccent}>no seu ritmo</span>
        </h1>
        <p>Conteúdo prático baseado no método Lucro Primeiro. Acesso gratuito para começar agora.</p>
        <div className={styles.heroActions}>
          <Link href="/?tab=signup" className={styles.heroPrimary}>＋ Criar conta gratuita</Link>
        </div>
        <div className={styles.heroSecondary}>Já tem conta? <Link href="/?tab=login">Entrar</Link> · 🔒 100% seguro</div>
      </div>
    </section>
  );
}
