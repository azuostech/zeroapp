import Link from 'next/link';
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

  return (
    <article className={styles.programCard}>
      <div
        className={`${styles.programCover} ${program.is_free ? styles.freeCover : styles.paidCover}`}
        style={program.cover_image_url ? { backgroundImage: `linear-gradient(rgba(10,10,10,.18), rgba(10,10,10,.42)), url("${program.cover_image_url}")` } : undefined}
      >
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
