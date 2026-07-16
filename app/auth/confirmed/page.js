import Image from 'next/image';
import Link from 'next/link';
import styles from './styles.module.css';

export const metadata = {
  title: 'E-mail confirmado | ZeroApp'
};

export default async function EmailConfirmedPage({ searchParams }) {
  const params = await searchParams;
  const success = params?.status === 'success';
  const hasSession = params?.session === 'active';

  return (
    <main className={styles.shell}>
      <div className={styles.glow} />
      <section className={styles.card} aria-live="polite">
        <Image className={styles.logo} src="/logo-zeroapp-light.png" alt="ZeroApp" width={104} height={104} priority />

        <div className={`${styles.icon} ${success ? styles.success : styles.error}`} aria-hidden="true">
          {success ? '✓' : '!'}
        </div>

        <h1>{success ? 'E-mail confirmado!' : 'Não foi possível confirmar'}</h1>
        <p>
          {success
            ? 'Seu endereço de e-mail foi validado com sucesso. Sua conta ZeroApp está pronta para ser acessada.'
            : 'Este link é inválido ou expirou. Solicite um novo cadastro ou entre em contato com o suporte.'}
        </p>

        <Link className={styles.primaryButton} href={success && hasSession ? '/app' : success ? '/?confirmed=success' : '/?tab=signup'}>
          {success && hasSession ? 'Acessar o ZeroApp' : success ? 'Ir para o login' : 'Voltar ao cadastro'}
        </Link>

        {success ? <span className={styles.note}>Confirmação concluída com segurança.</span> : null}
      </section>
    </main>
  );
}
