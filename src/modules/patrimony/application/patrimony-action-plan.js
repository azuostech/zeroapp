import { actionProgress } from '../domain/patrimony.action-plan';
import { listDebts } from './patrimony-service';

const fail = (error, fallback, status) => { if (error) { const next = new Error(error.message || fallback); if (status) next.status = status; throw next; } };

async function goalContributions({ supabase, userId }) {
  const first = new Date(); first.setUTCDate(1); first.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase.from('investment_movements').select('amount,investment_positions!inner(goal_id)').eq('user_id', userId).eq('kind', 'aporte').gte('occurred_on', first.toISOString().slice(0, 10));
  if (error) return {};
  return (data || []).reduce((acc, row) => { const goalId = row.investment_positions?.goal_id; if (goalId) acc[goalId] = (acc[goalId] || 0) + Number(row.amount || 0); return acc; }, {});
}

export async function listCurrentPlan({ supabase, userId }) {
  const [{ data, error }, debts, contributions] = await Promise.all([
    supabase.from('patrimony_commitments').select('*').eq('user_id', userId).is('closed_in_milestone_id', null).order('due_date', { ascending: true, nullsFirst: false }),
    listDebts({ supabase, userId }),
    goalContributions({ supabase, userId })
  ]);
  fail(error, 'action_plan_load_failed');
  const debtsById = Object.fromEntries(debts.map((item) => [item.id, item]));
  return (data || []).sort((a, b) => Number(['cumprido', 'nao_cumprido'].includes(a.status)) - Number(['cumprido', 'nao_cumprido'].includes(b.status))).map((item) => ({ ...item, progress: actionProgress(item, { debtsById, goalContributionsByGoalId: contributions }) }));
}

export async function createAction({ supabase, userId, input, origin = 'manual', context = {} }) {
  let baselineAmount = null;
  if (input.progress_source === 'debt_balance') {
    const { data, error } = await supabase.from('patrimony_debts').select('current_balance').eq('id', input.link_id).eq('user_id', userId).maybeSingle();
    fail(error, 'linked_debt_load_failed');
    if (!data) { const next = new Error('linked_debt_not_found'); next.status = 404; throw next; }
    baselineAmount = data.current_balance;
  }
  const latest = await supabase.from('patrimony_milestones').select('id').eq('user_id', userId).order('sequence', { ascending: false }).limit(1).maybeSingle();
  fail(latest.error, 'latest_milestone_load_failed');
  const { data, error } = await supabase.from('patrimony_commitments').insert({ ...input, user_id: userId, milestone_id: latest.data?.id || null, baseline_amount: baselineAmount, origin, context }).select('*').single();
  fail(error, 'action_create_failed'); return data;
}

export async function updateAction({ supabase, userId, id, input }) {
  const { data, error } = await supabase.from('patrimony_commitments').update(input).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
  fail(error, 'action_update_failed'); if (!data) { const next = new Error('not_found'); next.status = 404; throw next; } return data;
}

export async function deleteAction({ supabase, userId, id, isAdmin }) {
  const current = await supabase.from('patrimony_commitments').select('id,created_by_role').eq('id', id).eq('user_id', userId).maybeSingle();
  fail(current.error, 'action_load_failed'); if (!current.data) { const next = new Error('not_found'); next.status = 404; throw next; }
  if (!isAdmin && current.data.created_by_role === 'mentor') { const next = new Error('mentor_action'); next.status = 403; throw next; }
  const result = await supabase.from('patrimony_commitments').delete().eq('id', id).eq('user_id', userId); fail(result.error, 'action_delete_failed');
}
