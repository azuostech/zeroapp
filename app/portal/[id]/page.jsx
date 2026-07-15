import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogArticleCard from '@/components/portal/BlogArticleCard';
import PortalHeader from '@/components/portal/PortalHeader';
import styles from '@/components/portal/portal.module.css';
import {
  getCachedPublicBlogArticles,
  getCachedPublicPrograms
} from '@/src/modules/content/application/public-catalog-service';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const programs = await getCachedPublicPrograms().catch(() => []);
  const program = programs.find((item) => item.id === id);

  return {
    title: program ? `${program.title} — Portal Finanças do Zero` : 'Programa — Portal Finanças do Zero',
    description: program?.description || 'Conteúdo do Portal Finanças do Zero.'
  };
}

export default async function PortalProgramPage({ params }) {
  const { id } = await params;
  const programs = await getCachedPublicPrograms().catch(() => []);
  const program = programs.find((item) => item.id === id);
  if (!program) notFound();

  if (program.is_blog) {
    const articles = await getCachedPublicBlogArticles(program.id).catch(() => []);

    return (
      <div className={styles.portalPage}>
        <PortalHeader />
        <main className={styles.blogPageShell}>
          <header className={styles.blogPageHeader}>
            <span className={styles.freeBadge}>Acesso livre</span>
            <span className={styles.eyebrow}>Blog Finanças do Zero</span>
            <h1>{program.title}</h1>
            <p>{program.description || 'Artigos práticos para transformar sua relação com o dinheiro.'}</p>
            <div className={styles.metadata}>
              <span>{articles.length} {articles.length === 1 ? 'artigo publicado' : 'artigos publicados'}</span>
              <span>Sem necessidade de cadastro</span>
            </div>
          </header>

          {articles.length > 0 ? (
            <section aria-labelledby="blog-articles-title">
              <div className={styles.blogListHeading}>
                <div>
                  <span className={styles.eyebrow}>Leituras</span>
                  <h2 id="blog-articles-title">Conteúdos mais recentes</h2>
                </div>
                <Link href="/portal" className={styles.backTextLink}>← Voltar ao portal</Link>
              </div>
              <div className={styles.articleGrid}>
                {articles.map((article) => <BlogArticleCard key={article.id} article={article} />)}
              </div>
            </section>
          ) : (
            <div className={styles.emptyState}>Os primeiros artigos serão publicados em breve.</div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={styles.portalPage}>
      <PortalHeader />
      <main className={styles.detailShell}>
        <article className={styles.detailCard}>
          <span className={program.is_free ? styles.freeBadge : styles.lockedBadge}>
            {program.is_free ? 'Acesso livre' : `🔒 ${program.tier_required}`}
          </span>
          <h1>{program.title}</h1>
          <p>{program.description || 'Conteúdo prático para avançar na sua jornada financeira.'}</p>
          <div className={styles.metadata}>
            <span>{program.total_sessoes} sessões</span>
            <span>{program.total_aulas} conteúdos</span>
          </div>
          <div className={styles.detailActions}>
            <Link href={`/?tab=signup&next=${encodeURIComponent(`/conteudo/${program.id}`)}`} className={styles.cardPrimary}>
              Criar conta para acessar
            </Link>
            <Link href="/portal" className={styles.backLink}>Voltar ao portal</Link>
          </div>
        </article>
      </main>
    </div>
  );
}
