const ASSET_FIELDS = ['id', 'category', 'name', 'institution', 'current_value', 'liquidity', 'linked_debt_id'];
const DEBT_FIELDS = ['id', 'debt_type', 'creditor', 'current_balance', 'interest_rate_monthly', 'is_installment', 'installment_amount', 'installments_total', 'installments_paid', 'monthly_payment', 'days_overdue', 'status'];
const GOAL_FIELDS = ['id', 'kind', 'name', 'target_amount', 'target_date'];
const POSITION_FIELDS = ['id', 'goal_id', 'asset_class', 'name', 'current_value', 'invested_amount'];
const select = (record, fields) => Object.fromEntries(fields.map((field) => [field, record[field] ?? null]));

export function buildSnapshot({ assets = [], debts = [], settings = {}, goals = [], positions = [] }) {
  return {
    version: 2,
    captured_at: new Date().toISOString(),
    settings: {
      monthly_income: settings.monthly_income,
      monthly_cost_of_living: settings.monthly_cost_of_living,
      reserve_target_months: settings.reserve_target_months
    },
    assets: assets.map((item) => select(item, ASSET_FIELDS)),
    debts: debts.filter((item) => item.status === 'ativa').map((item) => select(item, DEBT_FIELDS)),
    goals: goals.filter((item) => !item.archived_at).map((item) => select(item, GOAL_FIELDS)),
    positions: positions.filter((item) => !item.archived_at && item.status !== 'encerrada').map((item) => select(item, POSITION_FIELDS))
  };
}

export async function safeMilestoneNotification({ userId, label, sender }) {
  try {
    return await sender(userId, {
      title: `Novo marco registrado: ${label}`,
      body: 'Veja sua evolução.',
      url: '/financas/patrimonio/evolucao'
    });
  } catch (error) {
    return { sent: 0, failed: 1, skipped: error?.message || 'push_failed' };
  }
}
