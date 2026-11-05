import { actionRequestSchema } from '@/src/modules/patrimony/domain/patrimony.validation';
import { createAction, listCurrentPlan } from '@/src/modules/patrimony/application/patrimony-action-plan';
import { errorResponse, json, parseBody, routeContext } from '@/src/modules/patrimony/application/patrimony-api';

export async function GET(request) {
  const resolved = await routeContext({ request, requestedUserId: request.nextUrl.searchParams.get('user_id'), resource: 'patrimony_action' });
  if (resolved.response) return resolved.response;
  try { return json({ data: await listCurrentPlan({ supabase: resolved.supabase, userId: resolved.context.targetUserId }) }); } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  const body = await parseBody(request); if (!body) return json({ error: 'invalid_json_body' }, 400);
  const parsed = actionRequestSchema.safeParse(body); if (!parsed.success) return json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
  const resolved = await routeContext({ request, requestedUserId: body.user_id, resource: 'patrimony_action', action: 'create' }); if (resolved.response) return resolved.response;
  try { const { origin = 'manual', context = {}, ...input } = parsed.data; return json({ data: await createAction({ supabase: resolved.supabase, userId: resolved.context.targetUserId, input, origin, context }) }, 201); } catch (error) { return errorResponse(error); }
}
