import { NextResponse } from 'next/server';
import { normalizeId, requireUser } from '../../comment-utils';

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const resolvedParams = await params;
  const replyId = normalizeId(resolvedParams?.replyId);
  if (!replyId) return NextResponse.json({ error: 'invalid_reply_id' }, { status: 400 });

  const { error: deleteError } = await supabase.from('content_comment_replies').delete().eq('id', replyId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'reply_delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
