import type { PropsWithChildren } from 'react';
import styles from './ui.module.css';

export function Card({ children }: PropsWithChildren) {
  return <div className={styles.card}>{children}</div>;
}
