export function DonutChart({ percent = 50 }: { percent?: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const c = 2 * Math.PI * 42;
  const offset = c - (p / 100) * c;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="42" stroke="#333" strokeWidth="12" fill="none" />
      <circle cx="60" cy="60" r="42" stroke="#00C853" strokeWidth="12" fill="none" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      <text x="60" y="64" textAnchor="middle" fill="#fff" fontSize="16">{p}%</text>
    </svg>
  );
}
