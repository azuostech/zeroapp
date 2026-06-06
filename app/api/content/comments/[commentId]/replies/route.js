import { NextResponse } from 'next/server';
import { normalizeBody, normalizeId, parseJsonBody, requireUser } from '../../comment-utils';

export async function POST(request, { params }) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const resolvedParams = await params;
  const commentId = normalizeId(resolvedParams?.commentId);
  if (!commentId) return NextResponse.json({ error: 'invalid_comment_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const body = normalizeBody(parsed.body?.body, 1);
  if (!body) return NextResponse.json({ error: 'Resposta vazia' }, { status: 422 });

  const { data, error: insertError } = await supabase
    .from('content_comment_replies')
    .insert({ comment_id: commentId, user_id: user.id, body })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'reply_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ reply: data }, { status: 201 });
}
