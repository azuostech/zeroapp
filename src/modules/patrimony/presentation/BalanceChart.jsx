import styles from './patrimony-enhanced.module.css';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function pointLabel(point, index) {
  if (point.kind === 'mensal') return MONTHS[Number(String(point.date).slice(5, 7)) - 1] || 'mês';
  if (/estado a/i.test(point.label || '')) return 'A';
  const number = String(point.label || '').match(/\d+/)?.[0];
  if (number) return `${/sess/i.test(point.label) ? 'S' : 'M'}${number}`;
  return point.label === 'Hoje' ? 'Hoje' : String(point.label || `M${index + 1}`).slice(0, 4);
}

export default function BalanceChart({ points = [] }) {
  if (!points.length) return null;
  const values = points.map((point) => Number(point.net_worth || 0));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const coords = values.map((value, index) => ({
    x: 22 + index * (276 / Math.max(1, values.length - 1)),
    y: 116 - ((value - min) / range) * 88
  }));
  const zeroY = 116 - ((0 - min) / range) * 88;

  return (
    <svg className={styles.balanceChart} viewBox="0 0 320 150" role="img" aria-label="Evolução do patrimônio líquido">
      <line x1="12" x2="308" y1={zeroY} y2={zeroY} className={styles.zeroLine} />
      <text x="14" y={Math.max(12, zeroY - 5)} className={styles.zeroLabel}>Patrimônio Zero</text>
      <polyline points={coords.map(({ x, y }) => `${x},${y}`).join(' ')} className={styles.balanceLine} />
      {coords.map(({ x, y }, index) => (
        <g key={`${points[index].date}-${points[index].kind}-${index}`}>
          <circle cx={x} cy={y} r="5" className={points[index].kind === 'mensal' ? styles.monthlyPoint : styles.milestonePoint} />
          <text x={x} y="140" textAnchor="middle" className={styles.pointLabel}>{pointLabel(points[index], index)}</text>
        </g>
      ))}
    </svg>
  );
}
