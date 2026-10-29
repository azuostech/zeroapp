import {
  cheaperReferenceRate,
  computeMetrics,
  debtMonthlyInterest,
  debtMonthlyOutflow,
  debtProgress,
  payoffSimulation,
  prioritizeDebts
} from '../domain/patrimony.calculations';
import { roundCents } from '../domain/patrimony.money';

function percentageDelta(current, baseline) {
  const from = Number(baseline);
  if (!Number.isFinite(from) || from === 0) return null;
  return roundCents((Number(current || 0) - from) / Math.abs(from) * 100);
}

export function getBaselineSnapshot(milestones = []) {
  return milestones.find((item) => Number(item.sequence) === 0)?.snapshot || null;
}

export function enrichDebts({ debts = [], settings = {}, baselineSnapshot = null }) {
  const baselineDebts = baselineSnapshot?.debts || [];
  const prioritized = prioritizeDebts(debts);
  const enrichedActive = prioritized.map((debt) => {
    const baselineDebt = baselineDebts.find((item) => item.id === debt.id) || null;
    const monthlyPayment = debtMonthlyOutflow(debt);
    const referenceRate = cheaperReferenceRate(debts, debt);
    const payoff = payoffSimulation({
      balance: debt.current_balance,
      monthlyRatePct: debt.interest_rate_monthly,
      monthlyPayment
    });
    const simulation = referenceRate == null ? null : payoffSimulation({
      balance: debt.current_balance,
      monthlyRatePct: referenceRate,
      monthlyPayment
    });

    return {
      ...debt,
      baselineDebt,
      baselineBalance: baselineDebt?.current_balance ?? null,
      balanceDelta: baselineDebt ? roundCents(Number(debt.current_balance) - Number(baselineDebt.current_balance)) : null,
      balanceDeltaPct: baselineDebt ? percentageDelta(debt.current_balance, baselineDebt.current_balance) : null,
      monthlyInterest: debtMonthlyInterest(debt),
      monthlyOutflow: monthlyPayment,
      progress: debtProgress(debt, baselineDebt),
      payoff,
      cheaperReferenceRate: referenceRate,
      simulation: simulation ? {
        rate: referenceRate,
        ...simulation,
        interestSavings: payoff.totalInterest != null && simulation.totalInterest != null
          ? roundCents(payoff.totalInterest - simulation.totalInterest)
          : null
      } : null
    };
  });
  const paid = debts.filter((item) => item.status === 'quitada').map((item) => ({
    ...item,
    priority: null,
    isExpensive: false,
    monthlyInterest: 0,
    monthlyOutflow: 0,
    progress: { pct: 100, label: 'Quitada' }
  }));
  const totals = computeMetrics({ debts, assets: [], settings });

  return {
    debts: [...enrichedActive, ...paid],
    totals: {
      ...totals,
      expensive_interest_share: totals.monthly_interest > 0
        ? roundCents(totals.expensive_debt_interest / totals.monthly_interest * 100)
        : 0
    }
  };
}

export function enrichAssets({ assets = [], debts = [], settings = {}, baselineSnapshot = null }) {
  const baselineAssets = baselineSnapshot?.assets || [];
  const byDebtId = new Map(debts.map((debt) => [debt.id, debt]));
  const enriched = assets.map((asset) => {
    const baselineAsset = baselineAssets.find((item) => item.id === asset.id) || null;
    return {
      ...asset,
      baselineAsset,
      baselineValue: baselineAsset?.current_value ?? null,
      valueDelta: baselineAsset ? roundCents(Number(asset.current_value) - Number(baselineAsset.current_value)) : null,
      valueDeltaPct: baselineAsset ? percentageDelta(asset.current_value, baselineAsset.current_value) : null,
      isNewSinceBaseline: Boolean(baselineSnapshot && !baselineAsset),
      linkedDebt: asset.linked_debt_id ? byDebtId.get(asset.linked_debt_id) || null : null
    };
  });
  const metrics = computeMetrics({ assets, debts, settings });
  return {
    assets: enriched,
    composition: {
      reserve: metrics.reserve_total,
      investments: metrics.investments_total,
      goods: metrics.goods_total,
      other: roundCents(metrics.total_assets - metrics.reserve_total - metrics.investments_total - metrics.goods_total)
    },
    reserveTargetValue: settings.monthly_cost_of_living == null
      ? null
      : roundCents(Number(settings.monthly_cost_of_living) * Number(settings.reserve_target_months || 6))
  };
}

export function calculateNetWorthProjection(points = []) {
  const valid = points
    .filter((point) => point?.date && Number.isFinite(Number(point?.metrics?.net_worth)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (valid.length < 2) return null;
  const from = valid[valid.length - 2];
  const to = valid[valid.length - 1];
  const days = Math.max(1, Math.round((new Date(`${to.date}T00:00:00Z`) - new Date(`${from.date}T00:00:00Z`)) / 86400000));
  const dailyChange = (Number(to.metrics.net_worth) - Number(from.metrics.net_worth)) / days;
  if (dailyChange <= 0 || Number(to.metrics.net_worth) >= 0) return null;
  const daysToZero = Math.ceil(Math.abs(Number(to.metrics.net_worth)) / dailyChange);
  const estimatedDate = new Date(`${to.date}T00:00:00Z`);
  estimatedDate.setUTCDate(estimatedDate.getUTCDate() + daysToZero);
  return { dailyChange: roundCents(dailyChange), daysToZero, estimatedDate: estimatedDate.toISOString().slice(0, 10) };
}

export function resolveComparisonPoint({ reference, milestones = [], current }) {
  if (reference === 'current') return current;
  const item = reference === 'baseline'
    ? milestones.find((entry) => entry.sequence === 0)
    : milestones.find((entry) => entry.id === reference);
  return item ? {
    id: item.id,
    label: item.label,
    date: item.milestone_date,
    metrics: item.metrics,
    snapshot: item.snapshot,
    mentorNote: item.mentor_note || null
  } : null;
}
