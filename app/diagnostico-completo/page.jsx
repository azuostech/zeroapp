import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import IrcExperience from '@/components/irc/IrcExperience';
import { getIrcRequestContext } from '@/src/modules/irc/application/irc-access';
import styles from './styles.module.css';

export const metadata = {
  title: 'Diagnóstico Completo | ZeroApp',
  description: 'Identificador e Reprogramador de Crenças do Finanças do Zero'
};

export const dynamic = 'force-dynamic';

export default async function DiagnosticoCompletoPage() {
  const context = await getIrcRequestContext();
  if (!context.ok && context.status === 401) redirect('/?next=/diagnostico-completo');

  if (!context.ok) {
    const checkoutUrl =
      process.env.NEXT_PUBLIC_IRC_CHECKOUT_URL ||
      'https://pay.kiwify.com.br/ukTsTso';

    return (
      <main className={styles.offerShell}>
        <section className={styles.offerCard}>
          <Image src="/logo-zeroapp-light.png" alt="ZeroApp" width={72} height={72} priority />
          <span className={styles.eyebrow}>Diagnóstico Completo + ZeroApp</span>
          <h1>Aprofunde o que está por trás das suas decisões financeiras</h1>
          <p>
            São 6 temas e 12 respostas objetivas, cruzadas em um relatório personalizado com seus padrões,
            crenças e próximos movimentos.
          </p>
          <div className={styles.price}>R$ 47,90</div>
          <a className={styles.buyButton} href={checkoutUrl}>ADQUIRIR DIAGNÓSTICO COMPLETO</a>
          <Link className={styles.backLink} href="/app">Voltar ao ZeroApp</Link>
        </section>
      </main>
    );
  }

  return <IrcExperience />;
}
