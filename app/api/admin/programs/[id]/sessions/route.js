import { NextResponse } from 'next/server';
import {
  normalizeId,
  normalizeNullableText,
  normalizeOrderIndex,
  normalizeVisibility,
  parseJsonBody,
  requireAdmin
} from '../../program-utils';

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const programId = normalizeId(resolvedParams?.id);
  if (!programId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { data, error: queryError } = await supabase
    .from('content_sessions')
    .select('*, member_area_content ( id, title, order_index, visibility, is_published )')
    .eq('program_id', programId)
    .order('order_index', { ascending: true });

  if (queryError) {
    return NextResponse.json({ error: queryError.message || 'sessions_list_failed' }, { status: 500 });
  }

  return NextResponse.json({ sessions: data || [] });
}

export async function POST(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const programId = normalizeId(resolvedParams?.id);
  if (!programId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body || {};

  const title = normalizeNullableText(body.title);
  const visibility = normalizeVisibility(body.visibility, 'visible');
  const orderIndex = normalizeOrderIndex(body.order_index, 0);

  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 422 });
  if (!visibility) return NextResponse.json({ error: 'invalid_visibility' }, { status: 422 });
  if (orderIndex === null) return NextResponse.json({ error: 'invalid_order_index' }, { status: 422 });

  const { data, error: insertError } = await supabase
    .from('content_sessions')
    .insert({
      program_id: programId,
      title,
      description: normalizeNullableText(body.description),
      visibility,
      order_index: orderIndex
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'session_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
