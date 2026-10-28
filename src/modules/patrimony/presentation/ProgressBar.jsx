import styles from './patrimony.module.css';
import { progressTone } from '@/src/modules/patrimony/domain/patrimony.calculations';
export default function ProgressBar({ value = 0, label }) { const tone = progressTone(value); return <div><div className={`${styles.bar} ${tone === 'gold' ? styles.gold : tone === 'orange' ? styles.orange : ''}`}><i style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></div>{label ? <small className={styles.muted}>{label}</small> : null}</div>; }
