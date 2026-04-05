import type { PropsWithChildren } from 'react';
import styles from './ui.module.css';

export function Table({ children }: PropsWithChildren) {
  return <table className={styles.table}>{children}</table>;
}
