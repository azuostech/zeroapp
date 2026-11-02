import { ASSET_CLASSES, POLICY_RULE_LABELS } from './investments.constants';
import { goalTotal } from './investments.goals';
import { formatBRL } from '../../patrimony/domain/patrimony.money';

const active = (item) => item.status !== 'encerrada' && !item.archived_at;
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const money = (items) => items.reduce((sum, item) => sum + Number(item.current_value || 0), 0);

export function evaluatePolicy({ rules = [], positions = [], goals = [], costOfLiving }) {
  const current = positions.filter(active); const total = money(current);
  const reserveGoal = goals.find((goal) => goal.kind === 'reserva_liquidez');
  const reservePositions = reserveGoal ? current.filter((item) => item.goal_id === reserveGoal.id) : [];
  const reserveTotal = reserveGoal ? goalTotal(reserveGoal.id, current) : 0;
  const variable = current.filter((item) => ASSET_CLASSES[item.asset_class]?.variableIncome); const variableTotal = money(variable);
  return rules.filter((rule) => rule.enabled !== false).map((rule) => {
    const params = rule.params || {}; const label = POLICY_RULE_LABELS[rule.type]?.(params) || rule.type;
    if (rule.type === 'reserve_months_target') {
      if (!(Number(costOfLiving) > 0)) return { type: rule.type, label, params, status: 'sem_dados', detail: 'Informe seu custo de vida.' };
      const target = Number(costOfLiving) * Number(params.months || 6); const pct = Math.round(reserveTotal / target * 100);
      return { type: rule.type, label, params, status: reserveTotal >= target ? 'ok' : 'construcao', detail: `${formatBRL(reserveTotal, { cents: false })} de ${formatBRL(target, { cents: false })}`, progressPct: Math.min(100, pct) };
    }
    if (rule.type === 'variable_income_after_reserve') {
      const targetRule = rules.find((item) => item.type === 'reserve_months_target'); const target = Number(costOfLiving || 0) * Number(targetRule?.params?.months || 6);
      const outside = variableTotal > 0 && (!(target > 0) || reserveTotal < target);
      const assetText = variable.length <= 2 ? variable.map((item) => item.name).join(' e ') : `${variable.length} ativos de renda variável`;
      const months = Number(costOfLiving) > 0 ? Math.round(reserveTotal / Number(costOfLiving) * 10) / 10 : 0;
      return { type: rule.type, label, params, status: outside ? 'fora' : 'ok', detail: outside ? `Você tem ${formatBRL(variableTotal, { cents: false })} em ${assetText} e a reserva está em ${String(months).replace('.', ',')} de ${targetRule?.params?.months || 6} meses.` : 'Reserva e renda variável dentro da sequência combinada.' };
    }
    if (rule.type === 'max_variable_income_pct') {
      const pct = total > 0 ? variableTotal / total * 100 : 0;
      return { type: rule.type, label, params, status: pct <= Number(params.pct || 0) ? 'ok' : 'fora', detail: `Hoje: ${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` };
    }
    if (rule.type === 'reserve_daily_liquidity_low_risk') {
      const compliant = reservePositions.filter((item) => Number(item.liquidity_days) <= 1 && !item.redeemable_from && !ASSET_CLASSES[item.asset_class]?.variableIncome && !(item.risk_flags || []).includes('credito_privado'));
      return { type: rule.type, label, params, status: compliant.length === reservePositions.length ? 'ok' : 'fora', detail: `${compliant.length} de ${reservePositions.length} investimentos dentro` };
    }
    if (rule.type === 'max_per_institution_fgc') {
      const exposures = new Map();
      for (const item of current.filter((position) => position.guarantee === 'fgc')) exposures.set(normalize(item.institution), (exposures.get(normalize(item.institution)) || 0) + Number(item.current_value || 0));
      const largest = [...exposures.entries()].sort((a, b) => b[1] - a[1])[0]; const institution = current.find((item) => normalize(item.institution) === largest?.[0])?.institution || '—';
      return { type: rule.type, label, params, status: !largest || largest[1] <= Number(params.amount) ? 'ok' : 'fora', detail: largest ? `Maior exposição: ${formatBRL(largest[1], { cents: false })} no ${institution}` : 'Sem exposição coberta pelo FGC.' };
    }
    return { type: rule.type, label, params, status: 'sem_dados', detail: 'Regra sem dados.' };
  });
}

export function summarizePolicy(results = []) { return { ok: results.filter((item) => item.status === 'ok').length, construcao: results.filter((item) => item.status === 'construcao').length, fora: results.filter((item) => item.status === 'fora').length }; }

export function checkNewPosition({ draft, rules, positions, goals, costOfLiving }) {
  const before = evaluatePolicy({ rules, positions, goals, costOfLiving });
  const after = evaluatePolicy({ rules, positions: [...positions, { ...draft, id: draft.id || 'draft', status: 'ativa', current_value: draft.current_value ?? draft.manual_value ?? draft.first_contribution?.amount ?? 0 }], goals, costOfLiving });
  let warnings = after.filter((item) => item.status === 'fora' && before.find((old) => old.type === item.type)?.status !== 'fora');
  const reserve = goals.find((goal) => goal.id === draft.goal_id)?.kind === 'reserva_liquidez';
  if (reserve && draft.redeemable_from) {
    warnings = warnings.filter((item) => item.type !== 'reserve_daily_liquidity_low_risk');
    warnings.push({ type: 'reserve_liquidity', status: 'fora', label: 'Carência na Reserva de Liquidez', detail: `Este dinheiro só fica disponível em ${draft.redeemable_from}.` });
  }
  return warnings;
}

export function positionsOutOfPolicy(results = [], positions = []) {
  const outside = new Set(); const types = new Set(results.filter((item) => item.status === 'fora').map((item) => item.type));
  if (types.has('variable_income_after_reserve') || types.has('max_variable_income_pct')) positions.filter((item) => ASSET_CLASSES[item.asset_class]?.variableIncome).forEach((item) => outside.add(item.id));
  if (types.has('reserve_daily_liquidity_low_risk')) positions.filter((item) => Number(item.liquidity_days) > 1 || item.redeemable_from || (item.risk_flags || []).includes('credito_privado')).forEach((item) => outside.add(item.id));
  return outside;
}
