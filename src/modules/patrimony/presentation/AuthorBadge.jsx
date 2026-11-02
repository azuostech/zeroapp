import { STALE_DAYS } from '@/src/modules/patrimony/domain/patrimony.constants';
import styles from './patrimony-enhanced.module.css';

function daysSince(value) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

export default function AuthorBadge({ item }) {
  if (item?.frozen_by_role) {
    return <span className={`${styles.authorBadge} ${item.frozen_by_role === 'mentor' ? styles.mentorBadge : ''}`}>{item.frozen_by_role}</span>;
  }
  const days = daysSince(item?.updated_at);
  if (days != null && days > STALE_DAYS) {
    return <span className={`${styles.authorBadge} ${styles.staleBadge}`}>sem atualização há {days} dias</span>;
  }
  if (item?.updated_by_role === 'mentor') {
    return <span className={`${styles.authorBadge} ${styles.mentorBadge}`}>mentor · {days === 0 ? 'agora' : `${days}d`}</span>;
  }
  const date = item?.updated_at ? new Date(item.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
  return <span className={styles.authorBadge}>aluno · {date}</span>;
}
