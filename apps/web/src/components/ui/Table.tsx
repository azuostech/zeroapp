import type { PropsWithChildren } from 'react';
import styles from './ui.module.css';

export function Table({ children }: PropsWithChildren) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
