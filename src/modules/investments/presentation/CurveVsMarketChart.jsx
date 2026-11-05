import styles from './investments.module.css';

function linePoints(points, key, min, max) {
  const range = Math.max(1, max - min); const step = points.length > 1 ? 298 / (points.length - 1) : 0;
  return points.map((item, index) => item[key] == null ? null : `${10 + index * step},${94 - (Number(item[key]) - min) / range * 78}`).filter(Boolean).join(' ');
}

export default function CurveVsMarketChart({ series = [], invested = 0 }) {
  const market = series.filter((item) => item.market != null); if (market.length < 2) return null;
  const points = series.filter((item) => item.curve != null || item.market != null); const values = points.flatMap((item) => [item.curve, item.market]).filter((value) => value != null).concat(Number(invested || 0)); const min = Math.min(...values); const max = Math.max(...values); const investedY = 94 - (Number(invested || 0) - min) / Math.max(1, max - min) * 78;
  return <figure className={styles.curveChart}><svg viewBox="0 0 318 110" role="img" aria-label="Comparação mensal entre valor na curva, valor de mercado e valor aplicado"><line x1="10" x2="308" y1={investedY} y2={investedY} className={styles.appliedLine} /><polyline points={linePoints(points, 'curve', min, max)} className={styles.curveLine} /><polyline points={linePoints(points, 'market', min, max)} className={styles.marketLine} /></svg><figcaption><span><i className={styles.curveDot} />Curva</span><span><i className={styles.marketDot} />Mercado</span><span><i className={styles.appliedDot} />Aplicado</span></figcaption></figure>;
}
