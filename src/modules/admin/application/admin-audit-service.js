const AUDIT_TABLE = 'admin_action_logs';

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  return metadata;
}

export async function recordAdminAudit({
  supabase,
  adminUserId,
  targetUserId,
  action,
  resource,
  resourceId = null,
  metadata = {}
}) {
  if (!adminUserId || !targetUserId || !action || !resource) return;

  const payload = {
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    action,
    resource,
    resource_id: resourceId,
    metadata: normalizeMetadata(metadata),
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from(AUDIT_TABLE).insert(payload);

  if (!error) return;

  const message = String(error.message || '');
  const missingTable =
    error.code === 'PGRST205' ||
    message.includes(`Could not find the table 'public.${AUDIT_TABLE}'`) ||
    message.toLowerCase().includes('relation "public.admin_action_logs" does not exist');

  if (missingTable) {
    console.warn(
      '[admin_audit] Tabela admin_action_logs não encontrada. Execute admin-audit.sql para ativar auditoria administrativa.'
    );
    return;
  }

  console.error('[admin_audit] Falha ao registrar auditoria administrativa:', error);
}
