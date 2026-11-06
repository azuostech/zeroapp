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
  if (!item?.created_by_role && days != null && days > STALE_DAYS) {
    return <span className={`${styles.authorBadge} ${styles.staleBadge}`}>sem atualização há {days} dias</span>;
  }
  const role = item?.updated_by_role || item?.created_by_role || 'aluno';
  const stamp = item?.updated_at || item?.created_at;
  const age = daysSince(stamp);
  if (role === 'sistema') return <span className={styles.authorBadge}>sistema</span>;
  if (role === 'mentor') {
    return <span className={`${styles.authorBadge} ${styles.mentorBadge}`}>mentor · {age === 0 ? 'agora' : age == null ? '—' : `${age}d`}</span>;
  }
  const date = stamp ? new Date(stamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
  return <span className={styles.authorBadge}>aluno · {date}</span>;
}
