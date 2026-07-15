import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogArticleExperience from '@/components/portal/BlogArticleExperience';
import PortalHeader from '@/components/portal/PortalHeader';
import styles from '@/components/portal/portal.module.css';
import { createServerSupabase } from '@/src/lib/supabase/server';
import {
  getCachedPublicBlogArticles,
  getCachedPublicPrograms
} from '@/src/modules/content/application/public-catalog-service';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

async function getArticle(programId, articleId) {
  const programs = await getCachedPublicPrograms().catch(() => []);
  const program = programs.find((item) => item.id === programId && item.is_blog);
  if (!program) return { program: null, article: null };

  const articles = await getCachedPublicBlogArticles(program.id).catch(() => []);
  const articleIndex = articles.findIndex((item) => item.id === articleId);
  return {
    program,
    article: articleIndex >= 0 ? articles[articleIndex] : null,
    previousArticle: articleIndex > 0 ? articles[articleIndex - 1] : null,
    nextArticle: articleIndex >= 0 && articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null
  };
}

export async function generateMetadata({ params }) {
  const { id, articleId } = await params;
  const { article } = await getArticle(id, articleId);

  return {
    title: article ? `${article.title} — Finanças do Zero` : 'Artigo — Finanças do Zero',
    description: article?.description || 'Artigo do Portal Finanças do Zero.'
  };
}

export default async function PortalArticlePage({ params }) {
  const { id, articleId } = await params;
  const [{ program, article, previousArticle, nextArticle }, isLoggedIn] = await Promise.all([
    getArticle(id, articleId),
    createServerSupabase()
      .then((supabase) => supabase.auth.getUser())
      .then(({ data }) => Boolean(data?.user))
      .catch(() => false)
  ]);
  if (!program || !article) notFound();

  return (
    <div className={styles.portalPage}>
      <PortalHeader />
      <main className={styles.articleReaderShell}>
        <div className={styles.articleReaderToolbar}>
          <Link href={`/portal/${program.id}`} className={styles.articleReaderBack}>
            ← Voltar aos artigos
          </Link>
          <h1 className={styles.articleReaderTitle}>{article.title}</h1>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.articleReaderExternal}
            aria-label="Abrir artigo original em nova aba"
          >
            Abrir original ↗
          </a>
        </div>
        <iframe
          src={article.url}
          title={article.title}
          className={styles.articleReaderFrame}
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div className={styles.articleReaderContent}>
          <BlogArticleExperience
            article={article}
            programId={program.id}
            previousArticle={previousArticle}
            nextArticle={nextArticle}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </main>
    </div>
  );
}
