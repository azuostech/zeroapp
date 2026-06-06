import { NextResponse } from 'next/server';
import {
  normalizeId,
  normalizeOrderIndex,
  parseJsonBody,
  requireAdmin
} from '../../../programs/program-utils';

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const contentId = normalizeId(resolvedParams?.id);
  if (!contentId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const body = parsed.body || {};
  const sessionId = body.session_id === null || body.session_id === '' ? null : normalizeId(body.session_id);
  const updates = { session_id: sessionId };

  if (Object.prototype.hasOwnProperty.call(body, 'order_index')) {
    const orderIndex = normalizeOrderIndex(body.order_index);
    if (orderIndex === null) return NextResponse.json({ error: 'invalid_order_index' }, { status: 422 });
    updates.order_index = orderIndex;
  }

  const { data, error: updateError } = await supabase
    .from('member_area_content')
    .update(updates)
    .eq('id', contentId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'content_session_update_failed' }, { status: 500 });
  }

  return NextResponse.json({ content: data });
}
