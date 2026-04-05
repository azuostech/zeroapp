import styles from './ui.module.css';

export function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.progress}>
      <span style={{ width: `${safe}%` }} />
    </div>
  );
}
