import { businessDaysBetween, firstDayOfMonth } from './investments.calendar';
import { roundCents } from '../../patrimony/domain/patrimony.money';

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const daysBetween = (from, to) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000));
const nextMonth = (month) => {
  const date = new Date(`${month}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
};

export function cashFlows(movements = []) {
  return movements.filter((item) => item.kind !== 'provento').map((item) => ({
    date: item.occurred_on,
    amount: ['resgate', 'vencimento'].includes(item.kind) ? -number(item.amount) : number(item.amount)
  })).sort((a, b) => a.date.localeCompare(b.date));
}

export function dailyIndexFactor({ series = [], from, to, pctOfIndex = 100 }) {
  return series.filter((item) => item.ref_date > from && item.ref_date <= to).reduce(
    (factor, item) => factor * (1 + number(item.value) / 100 * number(pctOfIndex) / 100),
    1
  );
}

export function preFactor(ratePctAA, businessDays) {
  return Math.pow(1 + number(ratePctAA) / 100, number(businessDays) / 252);
}

export function ipcaFactor({ ipcaMonthly = [], from, to }) {
  const sorted = [...ipcaMonthly].sort((a, b) => a.ref_date.localeCompare(b.ref_date));
  let month = firstDayOfMonth(from);
  let factor = 1;
  let usedProjection = false;
  while (month < to) {
    const end = nextMonth(month);
    const segmentStart = from > month ? from : month;
    const segmentEnd = to < end ? to : end;
    const touchedDays = daysBetween(segmentStart, segmentEnd);
    const monthDays = daysBetween(month, end);
    if (touchedDays > 0) {
      const exact = sorted.find((item) => item.ref_date === month);
      const fallback = [...sorted].reverse().find((item) => item.ref_date < month);
      const row = exact || fallback;
      if (row) factor *= Math.pow(1 + number(row.value) / 100, touchedDays / monthDays);
      if (!exact) usedProjection = true;
    }
    month = end;
  }
  return { factor, usedProjection };
}

export function curveValue({ movements = [], method, rate, series = [], ipcaMonthly = [], asOf }) {
  const flows = cashFlows(movements);
  const relevantSeries = series.filter((item) => item.ref_date <= asOf).sort((a, b) => a.ref_date.localeCompare(b.ref_date));
  const effectiveAsOf = ['cdi_curve', 'selic_curve'].includes(method) && relevantSeries.length ? relevantSeries.at(-1).ref_date : asOf;
  let usedProjection = false;
  const value = flows.reduce((total, flow) => {
    let factor = 1;
    if (method === 'cdi_curve') factor = dailyIndexFactor({ series: relevantSeries, from: flow.date, to: effectiveAsOf, pctOfIndex: rate });
    if (method === 'selic_curve') factor = dailyIndexFactor({ series: relevantSeries, from: flow.date, to: effectiveAsOf, pctOfIndex: rate ?? 100 });
    if (method === 'pre_curve') factor = preFactor(rate, businessDaysBetween(flow.date, asOf));
    if (method === 'ipca_curve') {
      const ipca = ipcaFactor({ ipcaMonthly, from: flow.date, to: asOf });
      factor = ipca.factor * preFactor(rate, businessDaysBetween(flow.date, asOf));
      usedProjection ||= ipca.usedProjection;
    }
    return total + flow.amount * factor;
  }, 0);
  return { value: roundCents(Math.max(0, value)), asOf: effectiveAsOf, usedProjection };
}

export const marketValue = ({ quantity, price }) => roundCents(number(quantity) * number(price));
export const deriveQuantity = ({ balance, price }) => number(price) > 0 ? Math.round(number(balance) / number(price) * 1e8) / 1e8 : null;

export function investedAmount(movements = []) {
  return roundCents(cashFlows(movements).reduce((total, item) => total + item.amount, 0));
}

export function averagePrice(movements = []) {
  const contributions = movements.filter((item) => item.kind === 'aporte' && number(item.quantity) > 0);
  const quantity = contributions.reduce((total, item) => total + number(item.quantity), 0);
  return quantity > 0 ? roundCents(contributions.reduce((total, item) => total + number(item.amount), 0) / quantity) : null;
}

export function positionReturn({ current_value, invested_amount }) {
  const abs = roundCents(number(current_value) - number(invested_amount));
  return { abs, pct: number(invested_amount) > 0 ? Math.round(abs / number(invested_amount) * 10000) / 100 : null };
}

export function monthReturn({ startValue, endValue, netFlows }) {
  const abs = roundCents(number(endValue) - number(startValue) - number(netFlows));
  const base = number(startValue) + number(netFlows) / 2;
  return { abs, pct: base > 0 ? Math.round(abs / base * 10000) / 100 : null };
}

export const indexPeriodPct = (args) => (dailyIndexFactor(args) - 1) * 100;
export const pctOfIndex = (returnPct, indexPct) => number(indexPct) > 0 ? number(returnPct) / number(indexPct) * 100 : null;
