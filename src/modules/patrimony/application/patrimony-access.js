import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';

const ALLOWED_TIERS = new Set(['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO']);
export async function resolvePatrimonyContext({ supabase, requestedUserId }) {
  const context = await resolveImpersonationContext({ supabase, requestedUserId });
  if (!context.ok) return context;
  if (!context.isAdmin && context.profile.status !== 'active') return { ok: false, status: 403, error: 'inactive_account' };
  const tier = String(context.targetProfile?.tier || 'DESPERTAR').toUpperCase();
  if (!context.isAdmin && !ALLOWED_TIERS.has(tier)) return { ok: false, status: 403, error: 'tier_required' };
  return { ...context, actorRole: context.impersonating || context.isAdmin ? 'mentor' : 'aluno' };
}
