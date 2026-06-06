import { NextResponse } from 'next/server';
import { mapAuthor, normalizeBody, normalizeId, parseJsonBody, requireUser } from '../../comments/comment-utils';

export async function GET(_request, { params }) {
  const { supabase, user, profile, error } = await requireUser();
  if (error) return error;

  const resolvedParams = await params;
  const contentId = normalizeId(resolvedParams?.id);
  if (!contentId) return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });

  const { data: comments, error: commentsError } = await supabase
    .from('content_comments')
    .select(
      `
        id,
        body,
        likes,
        created_at,
        user_id,
        content_comment_replies (
          id,
          body,
          created_at,
          user_id
        )
      `
    )
    .eq('content_id', contentId)
    .order('created_at', { ascending: false });

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message || 'comments_query_failed' }, { status: 500 });
  }

  const userIds = new Set();
  for (const comment of comments || []) {
    if (comment?.user_id) userIds.add(comment.user_id);
    for (const reply of comment?.content_comment_replies || []) {
      if (reply?.user_id) userIds.add(reply.user_id);
    }
  }

  const profilesById = new Map();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, tier, is_admin, role')
      .in('id', Array.from(userIds));

    for (const profile of profiles || []) {
      profilesById.set(profile.id, profile);
    }
  }

  const enriched = (comments || []).map((comment) => ({
    id: comment.id,
    body: comment.body,
    likes: comment.likes,
    created_at: comment.created_at,
    is_own: comment.user_id === user.id,
    can_delete: comment.user_id === user.id || profile?.role === 'admin' || profile?.is_admin === true,
    author: mapAuthor(profilesById.get(comment.user_id)),
    replies: [...(comment.content_comment_replies || [])]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((reply) => ({
        id: reply.id,
        body: reply.body,
        created_at: reply.created_at,
        is_own: reply.user_id === user.id,
        can_delete: reply.user_id === user.id || profile?.role === 'admin' || profile?.is_admin === true,
        author: mapAuthor(profilesById.get(reply.user_id))
      }))
  }));

  return NextResponse.json({ comments: enriched, total: enriched.length });
}

export async function POST(request, { params }) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const resolvedParams = await params;
  const contentId = normalizeId(resolvedParams?.id);
  if (!contentId) return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const body = normalizeBody(parsed.body?.body, 3);
  if (!body) return NextResponse.json({ error: 'Comentário muito curto' }, { status: 422 });

  const { data, error: insertError } = await supabase
    .from('content_comments')
    .insert({ content_id: contentId, user_id: user.id, body })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'comment_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}
