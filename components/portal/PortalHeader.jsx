import Image from 'next/image';
import Link from 'next/link';
import styles from './portal.module.css';

export default function PortalHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/portal" className={styles.brand} aria-label="Portal Financas do Zero">
          <Image src="/logo-zeroapp-light.png" alt="ZeroApp" width={40} height={40} priority />
          <span>Finanças do Zero</span>
        </Link>
        <nav className={styles.headerActions} aria-label="Acesso ao ZeroApp">
          <Link href="/?tab=login" className={styles.loginLink}>Entrar</Link>
          <Link href="/?tab=signup" className={styles.signupButton}>Cadastrar grátis <span aria-hidden="true">→</span></Link>
        </nav>
      </div>
    </header>
  );
}
