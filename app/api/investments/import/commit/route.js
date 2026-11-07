import { commitB3Import } from '@/src/modules/investments/application/investments-b3-import';
import { investmentsContext, errorResponse, json, parseBody } from '@/src/modules/investments/application/investments-api';

export async function POST(request) {
  const body = await parseBody(request);
  const resolved = await investmentsContext({ request, requestedUserId: body?.user_id, resource: 'investment_import', action: 'create' });
  if (resolved.response) return resolved.response;
  try { return json({ data: await commitB3Import({ supabase: resolved.supabase, userId: resolved.context.targetUserId, items: body?.items, fileName: body?.file_name }) }, 201); }
  catch (error) { return errorResponse(error); }
}
