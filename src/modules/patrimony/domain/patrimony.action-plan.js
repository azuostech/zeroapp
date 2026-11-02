import { formatBRL } from './patrimony.money';

export const ACTION_STATUS = ['aberto', 'em_andamento', 'cumprido', 'nao_cumprido'];
const clamp = (value) => Math.max(0, Math.min(1, value));

export function actionProgress(action, { debtsById = {}, goalContributionsByGoalId = {} } = {}) {
  if (action?.progress_source === 'debt_balance') {
    const baseline = Number(action.baseline_amount);
    const debt = debtsById[action.link_id] || debtsById.get?.(action.link_id);
    if (!(baseline > 0) || !debt) return null;
    const current = Number(debt.current_balance || 0);
    return { pct: Math.round(clamp(1 - current / baseline) * 100), label: `Faltam ${formatBRL(current, { cents: false })} · atualiza sozinho pelo Gestor de Dívidas` };
  }
  if (action?.progress_source === 'goal_contributions') {
    const target = Number(action.target_amount);
    if (!(target > 0)) return null;
    const current = Number(goalContributionsByGoalId[action.link_id] ?? goalContributionsByGoalId.get?.(action.link_id) ?? 0);
    return { pct: Math.round(clamp(current / target) * 100), label: `${formatBRL(current, { cents: false })} de ${formatBRL(target, { cents: false })} · atualiza sozinho pelos aportes` };
  }
  return null;
}

export function summarizePlan(actions = []) {
  const total = actions.length;
  const done = actions.filter((item) => item.status === 'cumprido').length;
  return { total, done, open: total - done, pct: total ? Math.round(done / total * 100) : 0 };
}

export function actionAuthorLabel(action) {
  return action?.created_by_role === 'mentor' ? 'mentor' : 'você';
}
