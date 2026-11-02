import { totalPrevisto } from '../../finance/domain/finance.calculations';

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const monthKey = (date) => String(date).slice(0, 7);
const previousMonth = (month) => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() - 1); return date.toISOString().slice(0, 7); };

export function plannedFromFinance(financialData = {}) {
  const data = financialData.data || financialData;
  const payFirst = data['pagar-primeiro'] || [];
  const reserve = totalPrevisto(payFirst.filter((item) => normalize(item.nome || item.name || item.categoria) === 'reserva de liquidez'));
  const investments = totalPrevisto(data.investimentos || []);
  return { reserve, investments, total: reserve + investments };
}

export function contributionStreak(contributionDates = [], today) {
  const months = new Set(contributionDates.map(monthKey)); let cursor = monthKey(today);
  if (!months.has(cursor)) cursor = previousMonth(cursor);
  let streak = 0;
  while (months.has(cursor)) { streak += 1; cursor = previousMonth(cursor); }
  return streak;
}

export function monthContributions(movements = [], monthStr) {
  return movements.filter((item) => item.kind === 'aporte' && monthKey(item.occurred_on) === monthStr).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}
