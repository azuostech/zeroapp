import styles from './ui.module.css';

export function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (avatar) {
    return <img src={avatar} alt={name} className={styles.avatar} />;
  }
  return <div className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</div>;
}
