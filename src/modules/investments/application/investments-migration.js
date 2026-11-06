const fail = (error, fallback, status) => { if (error) { const next = new Error(error.message || fallback); if (status) next.status = status; throw next; } };
const migrationDate = () => new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export async function listMigrationCandidates({ supabase, userId }) {
  const [assets, positions, goals] = await Promise.all([
    supabase.from('patrimony_assets').select('*').eq('user_id', userId).in('category', ['reserva', 'investimento']).is('archived_at', null).order('created_at'),
    supabase.from('investment_positions').select('migrated_from_asset_id').eq('user_id', userId).not('migrated_from_asset_id', 'is', null),
    supabase.from('investment_goals').select('id,kind,name').eq('user_id', userId).is('archived_at', null).order('sort_order')
  ]);
  fail(assets.error, 'assets_load_failed'); fail(positions.error, 'positions_load_failed'); fail(goals.error, 'goals_load_failed');
  const migrated = new Set((positions.data || []).map((item) => item.migrated_from_asset_id));
  return { candidates: (assets.data || []).filter((item) => !migrated.has(item.id)), goals: goals.data || [] };
}

export async function migrateAssets({ supabase, userId, assetIds, goalMap = {} }) {
  const available = await listMigrationCandidates({ supabase, userId });
  const selected = available.candidates.filter((item) => assetIds.includes(item.id));
  if (selected.length !== new Set(assetIds).size) fail(new Error('invalid_migration_assets'), null, 400);
  const goals = new Map(available.goals.map((item) => [item.id, item])); const created = [];
  for (const asset of selected) {
    const defaultKind = asset.category === 'reserva' ? 'reserva_liquidez' : 'independencia';
    const goalId = goalMap[asset.id] || available.goals.find((item) => item.kind === defaultKind)?.id;
    if (!goalId || !goals.has(goalId)) fail(new Error('invalid_migration_goal'), null, 400);
    const amount = Number(asset.current_value || 0); if (!(amount > 0)) fail(new Error('invalid_migration_value'), null, 400);
    const now = new Date().toISOString();
    const position = await supabase.from('investment_positions').insert({ user_id: userId, goal_id: goalId, asset_class: 'outro', name: asset.name, institution: asset.institution, pricing_method: 'manual', liquidity_days: ({ diaria: 0, curto_prazo: 30, longo_prazo: 365, iliquido: 3650 })[asset.liquidity] ?? null, guarantee: 'desconhecida', risk_flags: [], manual_value: amount, manual_value_at: now, current_value: amount, current_value_at: now, current_value_source: 'manual', invested_amount: amount, migrated_from_asset_id: asset.id }).select('*').single();
    fail(position.error, 'position_migration_failed');
    const movement = await supabase.from('investment_movements').insert({ user_id: userId, position_id: position.data.id, kind: 'aporte', amount, occurred_on: String(asset.created_at || now).slice(0, 10), source: 'migracao_patrimonio' }).select('*').single();
    if (movement.error) { await supabase.from('investment_positions').delete().eq('id', position.data.id).eq('user_id', userId); fail(movement.error, 'movement_migration_failed'); }
    const note = `Migrado para Investimentos em ${migrationDate()}`; const archived = await supabase.from('patrimony_assets').update({ archived_at: now, notes: asset.notes ? `${asset.notes}\n${note}` : note }).eq('id', asset.id).eq('user_id', userId).is('archived_at', null).select('id').maybeSingle();
    if (archived.error || !archived.data) { await supabase.from('investment_movements').delete().eq('id', movement.data.id).eq('user_id', userId); await supabase.from('investment_positions').delete().eq('id', position.data.id).eq('user_id', userId); fail(archived.error || new Error('asset_migration_conflict'), 'asset_archive_failed', 409); }
    created.push(position.data);
  }
  return { migrated: created.length, positions: created };
}
