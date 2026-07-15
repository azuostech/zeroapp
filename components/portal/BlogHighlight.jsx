import BlogArticleCard from './BlogArticleCard';
import styles from './portal.module.css';

export default function BlogHighlight({ program, articles = [] }) {
  if (!program) return null;

  const featuredArticles = articles.slice(0, 3);

  return (
    <section className={styles.section} aria-label="Artigos em destaque">
      {featuredArticles.length > 0 ? (
        <div className={styles.articleGrid}>
          {featuredArticles.map((article) => (
            <BlogArticleCard key={article.id} article={article} compact />
          ))}
        </div>
      ) : null}
    </section>
  );
}
