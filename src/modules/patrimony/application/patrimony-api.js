import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { resolvePatrimonyContext } from './patrimony-access';

export const json = (data, status = 200) => NextResponse.json(data, { status });
export const errorResponse = (error) => json({ error: error?.message || 'internal_error' }, error?.status || (error?.message === 'not_found' ? 404 : 500));
export async function routeContext({ request, requestedUserId, resource, action = 'read', resourceId = null }) {
  const supabase = await createServerSupabase(); const context = await resolvePatrimonyContext({ supabase, requestedUserId });
  if (!context.ok) return { response: json({ error: context.error }, context.status) };
  if (context.impersonating) await recordAdminAudit({ supabase, adminUserId: context.user.id, targetUserId: context.targetUserId, action, resource, resourceId, metadata: { path: request.nextUrl?.pathname || '' } });
  return { supabase, context };
}
export const parseBody = async (request) => request.json().catch(() => null);
