import { previewB3Import } from '@/src/modules/investments/application/investments-b3-import';
import { listPositions } from '@/src/modules/investments/application/investments-service';
import { investmentsContext, errorResponse, json } from '@/src/modules/investments/application/investments-api';

export const runtime = 'nodejs';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request) {
  const resolved = await investmentsContext({ request, requestedUserId: request.nextUrl.searchParams.get('user_id'), resource: 'investment_import', action: 'preview' });
  if (resolved.response) return resolved.response;
  try {
    const form = await request.formData(); const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'file_required' }, 400);
    if (!String(file.name || '').toLowerCase().endsWith('.xlsx')) return json({ error: 'xlsx_required' }, 400);
    if (Number(file.size || 0) > MAX_FILE_SIZE) return json({ error: 'file_too_large' }, 413);
    const positions = await listPositions({ supabase: resolved.supabase, userId: resolved.context.targetUserId });
    const data = await previewB3Import({ buffer: Buffer.from(await file.arrayBuffer()), positions });
    return json({ data: { ...data, fileName: String(file.name).slice(0, 120) } });
  } catch (error) { return errorResponse(error); }
}
