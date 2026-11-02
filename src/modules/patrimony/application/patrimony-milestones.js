import { computeMetrics } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { STALE_DAYS } from '@/src/modules/patrimony/domain/patrimony.constants';
import { listAssets, listDebts, getSettings } from './patrimony-service';
import { sendPushToUser } from '@/src/lib/push/push-service';
import { buildSnapshot, safeMilestoneNotification } from './patrimony-milestone-helpers';

const fail = (error, fallback) => { if (error) throw new Error(error.message || fallback); };

export { buildSnapshot } from './patrimony-milestone-helpers';
async function live({ supabase, userId }) { const [assets, debts, settings] = await Promise.all([listAssets({ supabase, userId }), listDebts({ supabase, userId }), getSettings({ supabase, userId })]); return { assets, debts, settings, metrics: computeMetrics({ assets, debts, settings }) }; }
export async function previewMilestone({ supabase, userId, actorRole = 'mentor' }) {
  const [{ data: milestones, error }, state] = await Promise.all([supabase.from('patrimony_milestones').select('id,sequence,label,milestone_date,metrics').eq('user_id', userId).order('sequence', { ascending: false }), live({ supabase, userId })]); fail(error, 'milestones_load_failed');
  const previous = milestones?.[0] || null; const baseline = milestones?.find((item) => item.sequence === 0) || null; const nextSequence = previous ? previous.sequence + 1 : 0;
  const staleItems = [...state.assets.map((item) => ({ ...item, entityType: 'asset' })), ...state.debts.map((item) => ({ ...item, entityType: 'debt' }))].map((item) => ({ ...item, daysSinceUpdate: Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 86400000) })).filter((item) => item.daysSinceUpdate > STALE_DAYS);
  const response = await supabase.from('patrimony_commitments').select('*').eq('user_id', userId).is('closed_in_milestone_id', null).not('status', 'in', '(cumprido,nao_cumprido)').order('created_at'); fail(response.error, 'commitments_load_failed');
  const nextLabel = nextSequence === 0 ? 'Estado A' : actorRole === 'mentor' ? `Sessão ${nextSequence + 1}` : `Marco ${nextSequence + 1}`;
  return { nextSequence, nextKind: nextSequence === 0 ? 'estado_a' : 'sessao', nextLabel, ...state, previous, baseline, staleItems, openCommitments: response.data || [] };
}
export async function notifyMilestone({ userId, label, sender = sendPushToUser }) {
  return safeMilestoneNotification({ userId, label, sender });
}

export async function freezeMilestone({ supabase, userId, actorId, actorRole = 'aluno', input, pushSender }) {
  const preview = await previewMilestone({ supabase, userId, actorRole }); const snapshot = buildSnapshot(preview);
  const payload = { user_id: userId, label: input.label || preview.nextLabel, milestone_date: input.milestone_date, snapshot, metrics: preview.metrics, mentor_note: actorRole === 'mentor' ? input.mentor_note : null, self_assessment: actorRole === 'aluno' ? input.self_assessment : null, student_reflection: actorRole === 'aluno' ? input.student_reflection : null, frozen_by: actorId };
  let result = await supabase.from('patrimony_milestones').insert(payload).select('*').single();
  if (result.error?.code === '23505') { const refreshed = await previewMilestone({ supabase, userId, actorRole }); result = await supabase.from('patrimony_milestones').insert({ ...payload, label: input.label || refreshed.nextLabel }).select('*').single(); }
  fail(result.error, 'milestone_freeze_failed'); const milestone = result.data;
  if (input.commitments?.length) { const { error } = await supabase.from('patrimony_commitments').insert(input.commitments.map((item) => ({ ...item, user_id: userId, milestone_id: milestone.id, origin: 'marco' }))); fail(error, 'commitments_create_failed'); }
  for (const item of input.resolve_commitments || []) { const terminal = ['cumprido', 'nao_cumprido'].includes(item.status); const { error } = await supabase.from('patrimony_commitments').update({ status: item.status, resolved_by: terminal ? actorId : null, resolved_at: terminal ? new Date().toISOString() : null, closed_in_milestone_id: terminal ? milestone.id : null }).eq('id', item.id).eq('user_id', userId); fail(error, 'commitment_resolve_failed'); }
  const push = actorRole === 'mentor' ? await notifyMilestone({ userId, label: milestone.label, sender: pushSender || sendPushToUser }) : { skipped: 'student_milestone' };
  return { ...milestone, push };
}
export async function listMilestones({ supabase, userId }) {
  const { data, error } = await supabase.from('patrimony_milestones').select('id,sequence,kind,label,milestone_date,metrics,mentor_note,frozen_by_role,self_assessment,student_reflection,patrimony_commitments(id,description,due_date,status,resolved_at)').eq('user_id', userId).order('sequence', { ascending: false }); fail(error, 'milestones_load_failed');
  return (data || []).map((item, index, all) => {
    const previous = all[index + 1];
    const commitmentItems = item.patrimony_commitments || [];
    return {
      ...item,
      patrimony_commitments: undefined,
      commitmentItems,
      openCommitments: commitmentItems.filter((entry) => entry.status === 'aberto'),
      commitments: {
        total: commitmentItems.length,
        cumpridos: commitmentItems.filter((entry) => entry.status === 'cumprido').length,
        nao_cumpridos: commitmentItems.filter((entry) => entry.status === 'nao_cumprido').length,
        abertos: commitmentItems.filter((entry) => entry.status === 'aberto').length
      },
      deltaNetWorth: previous ? Number(item.metrics?.net_worth || 0) - Number(previous.metrics?.net_worth || 0) : null
    };
  });
}
export async function deleteMilestone({ supabase, userId, id }) { const { data } = await supabase.from('patrimony_milestones').select('id').eq('user_id', userId).order('sequence', { ascending: false }).limit(1).maybeSingle(); if (!data || data.id !== id) { const error = new Error('only_last_milestone'); error.status = 409; throw error; } const detached = await supabase.from('patrimony_commitments').update({ milestone_id: null }).eq('milestone_id', id).neq('origin', 'marco'); fail(detached.error, 'commitment_detach_failed'); const result = await supabase.from('patrimony_milestones').delete().eq('id', id).eq('user_id', userId); fail(result.error, 'milestone_delete_failed'); }
