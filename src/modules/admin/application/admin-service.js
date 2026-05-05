export async function listUsers(supabase) {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Erro ao carregar usuários');
  return data || [];
}

export async function updateUserStatus({ supabase, actingUserId, targetUserId, status }) {
  const payload = { status };
  if (status === 'active') {
    payload.approved_at = new Date().toISOString();
    payload.approved_by = actingUserId;
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', targetUserId);
  if (error) throw new Error(error.message || 'Erro ao atualizar usuário');
}

const ALLOWED_TIERS = new Set(['DESPERTAR', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);

export async function updateUserTier({ supabase, targetUserId, tier }) {
  if (!ALLOWED_TIERS.has(tier)) {
    throw new Error('invalid_tier');
  }

  const { error } = await supabase.from('profiles').update({ tier }).eq('id', targetUserId);
  if (error) throw new Error(error.message || 'Erro ao atualizar tier');
}

export async function getUserFinancialHistory({ supabase, userId }) {
  const { data, error } = await supabase
    .from('financial_data')
    .select('month,year,data')
    .eq('user_id', userId)
    .order('year')
    .order('month');

  if (error) throw new Error(error.message || 'Erro ao carregar dados financeiros');
  return data || [];
}

export async function triggerPasswordReset({ supabase, email, redirectTo }) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message || 'Erro ao enviar reset');
}
