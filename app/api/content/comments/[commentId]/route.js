import { NextResponse } from 'next/server';
import { normalizeId, requireUser } from '../comment-utils';

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const resolvedParams = await params;
  const commentId = normalizeId(resolvedParams?.commentId);
  if (!commentId) return NextResponse.json({ error: 'invalid_comment_id' }, { status: 400 });

  const { error: deleteError } = await supabase.from('content_comments').delete().eq('id', commentId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'comment_delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
