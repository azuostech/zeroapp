import Link from 'next/link';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';
import styles from './portal.module.css';

function getHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch (_) {
    return 'Artigo externo';
  }
}

export default function BlogArticleCard({ article, compact = false }) {
  if (!article?.url) return null;

  const thumbnailUrl = resolveImageUrlForDisplay(article.thumbnail_url);
  const imageStyle = thumbnailUrl
    ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.32)), url(${JSON.stringify(thumbnailUrl)})` }
    : undefined;

  return (
    <Link
      href={`/portal/${article.program_id}/artigos/${article.id}`}
      className={`${styles.articleCard} ${compact ? styles.articleCardCompact : ''}`}
      aria-label={`Ler artigo: ${article.title}`}
    >
      <div className={`${styles.articleCover} ${thumbnailUrl ? '' : styles.articleCoverFallback}`} style={imageStyle}>
        <span>{article.session_title || 'Finanças do Zero'}</span>
      </div>
      <div className={styles.articleBody}>
        <span className={styles.articleSource}>{getHostname(article.url)}</span>
        <h3>{article.title}</h3>
        {article.description ? <p>{article.description}</p> : null}
        <span className={styles.articleLink}>Ler artigo <span aria-hidden="true">→</span></span>
      </div>
    </Link>
  );
}
