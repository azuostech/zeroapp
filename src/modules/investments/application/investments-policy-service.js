import { evaluatePolicy } from '../domain/investments.policy';

export async function getCurrentPolicy({ supabase, userId }) { const { data, error } = await supabase.from('investment_policies').select('*').eq('user_id', userId).order('version', { ascending: false }).limit(1).maybeSingle(); if (error) throw new Error(error.message); return data; }
export async function listPolicyVersions({ supabase, userId }) { const { data, error } = await supabase.from('investment_policies').select('*').eq('user_id', userId).order('version', { ascending: false }); if (error) throw new Error(error.message); return data || []; }
export async function createPolicyVersion({ supabase, userId, input }) {
  const { data, error } = await supabase.from('investment_policies').insert({ ...input, user_id: userId, version: 1 }).select('*').single(); if (error) throw new Error(error.message);
  const reserveRule = input.rules.find((item) => item.type === 'reserve_months_target' && item.enabled !== false);
  if (reserveRule?.params?.months) { const saved = await supabase.from('patrimony_settings').upsert({ user_id: userId, reserve_target_months: reserveRule.params.months }, { onConflict: 'user_id' }); if (saved.error) throw new Error(saved.error.message); }
  return data;
}
export async function currentPolicyEvaluation({ supabase, userId, positions, goals, costOfLiving }) { const policy = await getCurrentPolicy({ supabase, userId }); return { policy, results: evaluatePolicy({ rules: policy?.rules || [], positions, goals, costOfLiving }) }; }
