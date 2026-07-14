import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { buildWhatsappUrl } from '@/src/lib/commerce/access-offer';
import { createServerSupabase } from '@/src/lib/supabase/server';
import styles from './upgrade.module.css';

export const metadata = {
  title: 'Acesso exclusivo — ZeroApp',
  description: 'Conheça o Workshop Finanças do Zero e desbloqueie a experiência completa.'
};

const BENEFITS = [
  '6 Blocos Financeiros',
  'Gamificação completa',
  'Jornada SHAMAR',
  'Comunidade de alunos',
  'Minha Jornada',
  'Conteúdos exclusivos'
];

export default async function UpgradePage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect('/?next=/upgrade');

  const workshopUrl = buildWhatsappUrl(
    'Olá! Estou no ZeroApp e quero conhecer o Workshop Finanças do Zero para liberar os 6 Blocos Financeiros.'
  );

  return (
    <div className={styles.screen}>
      <AppHeader />
      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.icon} aria-hidden="true">🔓</div>
          <span className={styles.eyebrow}>Workshop Finanças do Zero</span>
          <h1>Acesso exclusivo</h1>
          <p className={styles.description}>
            Os 6 Blocos Financeiros fazem parte do Workshop. Lá você organiza sua vida financeira com um método prático,
            acompanhamento e ferramentas que ajudam a manter a constância.
          </p>

          <ul className={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <li key={benefit}><span className={styles.check}>✓</span>{benefit}</li>
            ))}
          </ul>

          <div className={styles.actions}>
            <a href={workshopUrl} target="_blank" rel="noreferrer" className={styles.primary}>Conhecer o Workshop</a>
            <Link href="/app" className={styles.secondary}>Voltar ao início</Link>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
