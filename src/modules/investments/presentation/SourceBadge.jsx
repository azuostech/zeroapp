import { SOURCE_LABELS, STALE_MANUAL_DAYS } from '../domain/investments.constants';
import styles from './investments.module.css';

export default function SourceBadge({ source, date }) {
  const key = String(source || 'manual').toLowerCase();
  const age = date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : null;
  const stale = key === 'manual' && age != null && age > STALE_MANUAL_DAYS;
  const market = ['b3', 'tesouro', 'cvm'].includes(key);
  return <span className={`${styles.sourceBadge} ${market ? styles.sourceMarket : key === 'estimado' || key === 'bcb' ? styles.sourceEstimated : stale ? styles.sourceStale : styles.sourceManual}`}>{SOURCE_LABELS[key] || source || 'Manual'}{date ? ` · ${new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}</span>;
}
