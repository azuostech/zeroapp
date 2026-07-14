import Link from 'next/link';
import styles from './portal.module.css';

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function BlogHighlight({ program }) {
  if (!program) return null;

  return (
    <section className={styles.section} aria-labelledby="portal-blog-title">
      <div className={styles.eyebrow}>Destaque</div>
      <article className={styles.blogCard}>
        <div>
          <span className={styles.freeBadge}>Acesso livre</span>
          <h2 id="portal-blog-title">{program.title}</h2>
          <p>{program.description || 'Artigos práticos para transformar sua relação com o dinheiro.'}</p>
          <div className={styles.metadata}>
            <span>{pluralize(program.total_aulas, 'artigo', 'artigos')}</span>
            <span>{pluralize(program.total_sessoes, 'coleção', 'coleções')}</span>
          </div>
        </div>
        <Link href={`/portal/${program.id}`} className={styles.outlineButton}>Acessar blog <span aria-hidden="true">→</span></Link>
      </article>
    </section>
  );
}
