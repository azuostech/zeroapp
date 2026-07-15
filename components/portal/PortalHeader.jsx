import Image from 'next/image';
import Link from 'next/link';
import PortalTopBar from './PortalTopBar';
import styles from './portal.module.css';

export default function PortalHeader() {
  return (
    <header className={styles.header}>
      <PortalTopBar />
      <div className={styles.headerInner}>
        <Link href="/portal" className={styles.brand} aria-label="Portal Finanças do Zero">
          <span className={styles.brandMark}>
            <Image src="/logo-zeroapp-light.png" alt="" width={32} height={32} priority />
          </span>
          <span>Finanças do Zero</span>
        </Link>
        <nav className={styles.headerActions} aria-label="Acesso ao ZeroApp">
          <Link href="/?tab=login" className={styles.loginLink}>Entrar</Link>
          <Link href="/?tab=signup" className={styles.signupButton}>Cadastrar grátis</Link>
        </nav>
      </div>
    </header>
  );
}
