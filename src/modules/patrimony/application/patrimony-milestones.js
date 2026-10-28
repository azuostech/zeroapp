import { computeMetrics } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { STALE_DAYS } from '@/src/modules/patrimony/domain/patrimony.constants';
import { listAssets, listDebts, getSettings } from './patrimony-service';

const ASSET_FIELDS = ['id', 'category', 'name', 'institution', 'current_value', 'liquidity', 'linked_debt_id'];
const DEBT_FIELDS = ['id', 'debt_type', 'creditor', 'current_balance', 'interest_rate_monthly', 'is_installment', 'installment_amount', 'installments_total', 'installments_paid', 'monthly_payment', 'days_overdue', 'status'];
const select = (record, fields) => Object.fromEntries(fields.map((field) => [field, record[field] ?? null]));
const fail = (error, fallback) => { if (error) throw new Error(error.message || fallback); };

export function buildSnapshot({ assets = [], debts = [], settings = {} }) {
  return { version: 1, captured_at: new Date().toISOString(), settings: { monthly_income: settings.monthly_income, monthly_cost_of_living: settings.monthly_cost_of_living, reserve_target_months: settings.reserve_target_months }, assets: assets.map((item) => select(item, ASSET_FIELDS)), debts: debts.filter((item) => item.status === 'ativa').map((item) => select(item, DEBT_FIELDS)) };
}
async function live({ supabase, userId }) { const [assets, debts, settings] = await Promise.all([listAssets({ supabase, userId }), listDebts({ supabase, userId }), getSettings({ supabase, userId })]); return { assets, debts, settings, metrics: computeMetrics({ assets, debts, settings }) }; }
export async function previewMilestone({ supabase, userId }) {
  const [{ data: milestones, error }, state] = await Promise.all([supabase.from('patrimony_milestones').select('id,sequence,label,milestone_date,metrics').eq('user_id', userId).order('sequence', { ascending: false }), live({ supabase, userId })]); fail(error, 'milestones_load_failed');
  const previous = milestones?.[0] || null; const baseline = milestones?.find((item) => item.sequence === 0) || null; const nextSequence = previous ? previous.sequence + 1 : 0;
  const staleItems = [...state.assets.map((item) => ({ ...item, entityType: 'asset' })), ...state.debts.map((item) => ({ ...item, entityType: 'debt' }))].map((item) => ({ ...item, daysSinceUpdate: Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 86400000) })).filter((item) => item.daysSinceUpdate > STALE_DAYS);
  let openCommitments = []; if (previous) { const response = await supabase.from('patrimony_commitments').select('*').eq('milestone_id', previous.id).eq('status', 'aberto').order('created_at'); fail(response.error, 'commitments_load_failed'); openCommitments = response.data || []; }
  return { nextSequence, nextKind: nextSequence === 0 ? 'estado_a' : 'sessao', nextLabel: nextSequence === 0 ? 'Estado A' : `Sessão ${nextSequence + 1}`, ...state, previous, baseline, staleItems, openCommitments };
}
export async function freezeMilestone({ supabase, userId, actorId, input }) {
  const preview = await previewMilestone({ supabase, userId }); const snapshot = buildSnapshot(preview);
  const payload = { user_id: userId, sequence: preview.nextSequence, kind: preview.nextKind, label: input.label || preview.nextLabel, milestone_date: input.milestone_date, snapshot, metrics: preview.metrics, mentor_note: input.mentor_note, frozen_by: actorId };
  let result = await supabase.from('patrimony_milestones').insert(payload).select('*').single();
  if (result.error?.code === '23505') { const refreshed = await previewMilestone({ supabase, userId }); result = await supabase.from('patrimony_milestones').insert({ ...payload, sequence: refreshed.nextSequence, kind: refreshed.nextKind, label: input.label || refreshed.nextLabel }).select('*').single(); }
  fail(result.error, 'milestone_freeze_failed'); const milestone = result.data;
  if (input.commitments?.length) { const { error } = await supabase.from('patrimony_commitments').insert(input.commitments.map((item) => ({ ...item, user_id: userId, milestone_id: milestone.id }))); fail(error, 'commitments_create_failed'); }
  for (const item of input.resolve_commitments || []) { const { error } = await supabase.from('patrimony_commitments').update({ status: item.status, resolved_by: actorId, resolved_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', userId); fail(error, 'commitment_resolve_failed'); }
  return milestone;
}
export async function listMilestones({ supabase, userId }) {
  const { data, error } = await supabase.from('patrimony_milestones').select('id,sequence,kind,label,milestone_date,metrics,mentor_note,patrimony_commitments(id,status)').eq('user_id', userId).order('sequence', { ascending: false }); fail(error, 'milestones_load_failed');
  return (data || []).map((item, index, all) => { const previous = all[index + 1]; const commitments = item.patrimony_commitments || []; return { ...item, patrimony_commitments: undefined, commitments: { total: commitments.length, cumpridos: commitments.filter((entry) => entry.status === 'cumprido').length }, deltaNetWorth: previous ? Number(item.metrics?.net_worth || 0) - Number(previous.metrics?.net_worth || 0) : null }; });
}
export async function deleteMilestone({ supabase, userId, id }) { const { data } = await supabase.from('patrimony_milestones').select('id').eq('user_id', userId).order('sequence', { ascending: false }).limit(1).maybeSingle(); if (!data || data.id !== id) { const error = new Error('only_last_milestone'); error.status = 409; throw error; } const result = await supabase.from('patrimony_milestones').delete().eq('id', id).eq('user_id', userId); fail(result.error, 'milestone_delete_failed'); }
