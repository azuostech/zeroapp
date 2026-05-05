'use client';

export default function ProgressIndicator({ value = 0, max = 1 }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-[11px] uppercase tracking-[0.5px] text-[#888]">
        <span>Respostas</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-[#333]">
        <div
          className="h-full bg-gradient-to-r from-[#00C853] to-[#69f0ae] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
