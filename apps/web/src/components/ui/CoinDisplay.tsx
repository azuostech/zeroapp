import styles from './ui.module.css';

export function CoinDisplay({ amount }: { amount: number }) {
  return <span className={styles.coinDisplay}>🪙 {amount}</span>;
}
