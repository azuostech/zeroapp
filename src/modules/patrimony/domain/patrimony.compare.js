import { COMPARE_INDICATORS } from './patrimony.constants';
import { roundCents } from './patrimony.money';

export function compareMetrics(fromMetrics = {}, toMetrics = {}) {
  const indicators = COMPARE_INDICATORS.filter(({ key }) => fromMetrics[key] != null && toMetrics[key] != null).map((definition) => {
    const from = Number(fromMetrics[definition.key]); const to = Number(toMetrics[definition.key]); const delta = roundCents(to - from);
    const same = Math.abs(delta) < 0.005;
    const improved = definition.better === 'higher' ? delta > 0 : delta < 0;
    return { key: definition.key, label: definition.label, format: definition.format, from, to, delta, deltaPct: from === 0 ? null : (to - from) / Math.abs(from) * 100, direction: same ? 'same' : improved ? 'better' : 'worse' };
  });
  return { indicators, improvedCount: indicators.filter((item) => item.direction === 'better').length, worsenedCount: indicators.filter((item) => item.direction === 'worse').length, totalCount: indicators.length };
}

export function verdict({ improvedCount, totalCount, worsenedCount }) {
  let tone = 'attention'; let title = 'Hora de ajustar a rota.';
  if (improvedCount >= Math.ceil(totalCount * 0.6) && worsenedCount === 0) { tone = 'positive'; title = 'Está acontecendo.'; }
  else if (improvedCount > worsenedCount) { tone = 'positive'; title = 'Está acontecendo, com pontos de atenção.'; }
  else if (improvedCount === worsenedCount) { tone = 'neutral'; title = 'Estável.'; }
  return { tone, title, subtitle: `${improvedCount} de ${totalCount} indicadores melhoraram.` };
}

export function daysBetween(fromDate, toDate) {
  const start = new Date(`${String(fromDate).slice(0, 10)}T00:00:00Z`); const end = new Date(`${String(toDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end - start) / 86400000);
}

export function pickShareHighlight(indicators = []) {
  const narrativePriority = ['expensive_debt_total', 'total_debts', 'monthly_interest', 'reserve_total', 'overdue_count'];
  const rank = (key) => {
    const index = narrativePriority.indexOf(key);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const candidates = indicators.filter((item) => item.key !== 'net_worth' && item.direction === 'better').map((item) => ({ ...item, gain: item.deltaPct == null ? 0 : Math.abs(item.deltaPct) })).sort((a, b) => rank(a.key) - rank(b.key) || b.gain - a.gain);
  const item = candidates[0]; if (!item) return 'Estou construindo uma nova história financeira.';
  const pct = Math.round(item.gain);
  if (item.key === 'expensive_debt_total') return pct >= 45 ? 'Cortei pela metade a dívida cara.' : `Reduzi ${pct}% da minha dívida cara.`;
  if (item.key === 'total_debts') return `Reduzi ${pct}% das minhas dívidas.`;
  if (item.key === 'monthly_interest') return `Pago ${pct}% menos de juros por mês.`;
  if (item.key === 'reserve_total' && item.from === 0 && item.to > 0) return 'Criei minha reserva de emergência.';
  if (item.key === 'overdue_count' && item.to === 0) return 'Zerei as contas em atraso.';
  return `${item.label}: ${pct}% de evolução.`;
}
