import { NavLink } from 'react-router-dom';
import styles from './ui.module.css';

export function Tabs({ items }: { items: Array<{ to: string; label: string }> }) {
  return (
    <div className={styles.tabs}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
