import Link from 'next/link';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';
import styles from './portal.module.css';

const TIER_LABELS = {
  MOVIMENTO: 'Workshop',
  ACELERACAO: 'Aceleração',
  AUTOGOVERNO: 'Autogoverno'
};

function getProgramHref(program, isLoggedIn) {
  if (program.is_free && isLoggedIn) return `/conteudo/${program.id}`;
  if (program.is_free) return `/?tab=signup&next=${encodeURIComponent(`/conteudo/${program.id}`)}`;
  return `/?tab=signup&interest=${encodeURIComponent(program.title)}`;
}

export default function PortalProgramCard({ program, isLoggedIn = false }) {
  const tierLabel = TIER_LABELS[program.tier_required] || program.tier_required || 'Exclusivo';
  const href = getProgramHref(program, isLoggedIn);
  const thumbnailUrl = resolveImageUrlForDisplay(program.cover_image_url);

  return (
    <article className={styles.programCard}>
      <div className={`${styles.programCover} ${program.is_free ? styles.freeCover : styles.paidCover}`}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className={styles.programCoverImage} loading="lazy" />
        ) : null}
        {thumbnailUrl ? <span className={styles.programCoverShade} aria-hidden="true" /> : null}
        <span className={program.is_free ? styles.freeBadge : styles.lockedBadge}>
          {program.is_free ? 'Grátis' : `🔒 ${tierLabel}`}
        </span>
      </div>
      <div className={styles.programBody}>
        <h3>{program.title}</h3>
        <p>{program.description || 'Conteúdo prático para avançar na sua jornada financeira.'}</p>
        <div className={styles.metadata}>
          <span>{program.total_sessoes} sessões</span>
          <span>{program.total_aulas} aulas</span>
        </div>
        <Link href={href} className={program.is_free ? styles.cardPrimary : styles.cardSecondary}>
          {program.is_free ? 'Acessar' : 'Ver detalhes'} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
