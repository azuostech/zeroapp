import { actionInputSchema } from '@/src/modules/patrimony/domain/patrimony.validation';
import { deleteAction, updateAction } from '@/src/modules/patrimony/application/patrimony-action-plan';
import { errorResponse, json, parseBody, routeContext } from '@/src/modules/patrimony/application/patrimony-api';

export async function PATCH(request, { params }) {
  const { id } = await params; const body = await parseBody(request); const parsed = actionInputSchema.partial().safeParse(body);
  if (!parsed.success) return json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
  const resolved = await routeContext({ request, requestedUserId: body?.user_id, resource: 'patrimony_action', action: 'update', resourceId: id }); if (resolved.response) return resolved.response;
  try { return json({ data: await updateAction({ supabase: resolved.supabase, userId: resolved.context.targetUserId, id, input: parsed.data }) }); } catch (error) { return errorResponse(error); }
}

export async function DELETE(request, { params }) {
  const { id } = await params; const resolved = await routeContext({ request, requestedUserId: request.nextUrl.searchParams.get('user_id'), resource: 'patrimony_action', action: 'archive', resourceId: id }); if (resolved.response) return resolved.response;
  try { await deleteAction({ supabase: resolved.supabase, userId: resolved.context.targetUserId, id, isAdmin: resolved.context.isAdmin }); return new Response(null, { status: 204 }); } catch (error) { return errorResponse(error); }
}
