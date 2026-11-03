import { addMonths } from './investments.calendar';

const LABEL = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export function buildCalendar({ positions = [], goals = [], today, horizonMonths = 12 }) {
  const horizon = addMonths(today, horizonMonths); const events = [];
  const add = (date, type, title, id, value = null) => { if (date && date >= today && date <= horizon) events.push({ date, type, title, id, value }); };
  for (const item of positions.filter((position) => position.status !== 'encerrada' && !position.archived_at)) {
    add(item.maturity_date, 'maturity', `Vence: ${item.name}`, item.id, Number(item.current_value || 0));
    add(item.redeemable_from, 'redeemable', `Fim da carência: ${item.name}`, item.id, Number(item.current_value || 0));
  }
  for (const goal of goals.filter((item) => !item.archived_at)) add(goal.target_date, 'goal', `Prazo do objetivo: ${goal.name}`, goal.id);
  const grouped = new Map();
  for (const event of events.sort((a, b) => a.date.localeCompare(b.date))) {
    const month = event.date.slice(0, 7); if (!grouped.has(month)) grouped.set(month, []); grouped.get(month).push(event);
  }
  const months = [...grouped.entries()].map(([month, monthEvents]) => ({ month, label: LABEL.format(new Date(`${month}-01T00:00:00Z`)), events: monthEvents }));
  return { months, thisMonthCount: events.filter((item) => item.date.slice(0, 7) === today.slice(0, 7)).length };
}
