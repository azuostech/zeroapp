import Link from 'next/link';
import styles from './portal.module.css';

export default function CtaStrip() {
  return (
    <section className={styles.ctaStrip}>
      <div>
        <span className={styles.eyebrowLight}>Próximo passo</span>
        <h2>Quer <span>acesso completo?</span></h2>
        <p>Cadastre-se grátis para acessar os fundamentos e evolua quando estiver pronto.</p>
      </div>
      <div className={styles.ctaActions}>
        <Link href="/?tab=signup" className={styles.ctaPrimary}>Criar conta grátis</Link>
        <Link href="/upgrade" className={styles.ctaSecondary}>Ver planos</Link>
      </div>
    </section>
  );
}
