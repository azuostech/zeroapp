import { NextResponse } from 'next/server';
import {
  normalizeId,
  normalizeNullableText,
  normalizeOrderIndex,
  normalizeVisibility,
  parseJsonBody,
  requireAdmin
} from '../../programs/program-utils';

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const sessionId = normalizeId(resolvedParams?.id);
  if (!sessionId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const updates = {};
  for (const [field, value] of Object.entries(parsed.body || {})) {
    if (field === 'title') {
      const normalized = normalizeNullableText(value);
      if (!normalized) return NextResponse.json({ error: 'title_required' }, { status: 422 });
      updates.title = normalized;
    }

    if (field === 'description') updates.description = normalizeNullableText(value);

    if (field === 'visibility') {
      const normalized = normalizeVisibility(value);
      if (!normalized) return NextResponse.json({ error: 'invalid_visibility' }, { status: 422 });
      updates.visibility = normalized;
    }

    if (field === 'order_index') {
      const normalized = normalizeOrderIndex(value);
      if (normalized === null) return NextResponse.json({ error: 'invalid_order_index' }, { status: 422 });
      updates.order_index = normalized;
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'no_updates' }, { status: 422 });
  }

  const { data, error: updateError } = await supabase
    .from('content_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'session_update_failed' }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const sessionId = normalizeId(resolvedParams?.id);
  if (!sessionId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { error: unlinkError } = await supabase
    .from('member_area_content')
    .update({ session_id: null })
    .eq('session_id', sessionId);

  if (unlinkError) {
    return NextResponse.json({ error: unlinkError.message || 'session_unlink_failed' }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from('content_sessions').delete().eq('id', sessionId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'session_delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
