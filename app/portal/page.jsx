import BlogHighlight from '@/components/portal/BlogHighlight';
import CtaStrip from '@/components/portal/CtaStrip';
import PortalHeader from '@/components/portal/PortalHeader';
import PortalHero from '@/components/portal/PortalHero';
import PortalDivider from '@/components/portal/PortalDivider';
import PortalProgramCard from '@/components/portal/PortalProgramCard';
import styles from '@/components/portal/portal.module.css';
import { createServerSupabase } from '@/src/lib/supabase/server';
import {
  getCachedPublicBlogArticles,
  getCachedPublicPrograms
} from '@/src/modules/content/application/public-catalog-service';

export const metadata = {
  title: 'Portal Finanças do Zero — Educação financeira gratuita',
  description: 'Conteúdo prático baseado no método Lucro Primeiro. Acesse aulas e artigos gratuitos sobre finanças pessoais.',
  openGraph: {
    title: 'Portal Finanças do Zero',
    description: 'Educação financeira gratuita baseada no método Lucro Primeiro.',
    url: 'https://zeroapp.tech/portal',
    siteName: 'Finanças do Zero'
  }
};

export const revalidate = 300;
export const dynamic = 'force-dynamic';

async function getPortalData() {
  const programsPromise = getCachedPublicPrograms().catch((error) => {
    console.error('[portal] catalog failed:', error?.message || error);
    return [];
  });
  const sessionPromise = createServerSupabase()
    .then((supabase) => supabase.auth.getUser())
    .then(({ data }) => Boolean(data?.user))
    .catch(() => false);

  const [programs, isLoggedIn] = await Promise.all([programsPromise, sessionPromise]);
  const blogProgram = programs.find((program) => program.is_blog);
  const blogArticles = blogProgram
    ? await getCachedPublicBlogArticles(blogProgram.id).catch((error) => {
        console.error('[portal] blog articles failed:', error?.message || error);
        return [];
      })
    : [];
  return { programs, isLoggedIn, blogArticles };
}

export default async function PortalPage() {
  const { programs, isLoggedIn, blogArticles } = await getPortalData();
  const blogProgram = programs.find((program) => program.is_blog);
  const displayedPrograms = programs.filter((program) => !program.is_blog);

  return (
    <div className={styles.portalPage}>
      <PortalHeader />
      <PortalHero />
      <PortalDivider />
      <main className={styles.main}>
        <BlogHighlight program={blogProgram} articles={blogArticles} />

        <PortalDivider />

        <section className={styles.section} aria-labelledby="all-programs-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Todos os programas</span>
              <h2 id="all-programs-title">Todos os programas</h2>
            </div>
            <p><strong>{displayedPrograms.length}</strong> disponíveis · comece pelos conteúdos gratuitos</p>
          </div>

          {displayedPrograms.length > 0 ? (
            <div className={styles.programGrid}>
              {displayedPrograms.map((program) => (
                <PortalProgramCard key={program.id} program={program} isLoggedIn={isLoggedIn} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>Novos programas serão publicados em breve.</div>
          )}
        </section>

        <PortalDivider />
        <CtaStrip />
      </main>
    </div>
  );
}
