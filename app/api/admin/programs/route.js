import { NextResponse } from 'next/server';
import {
  normalizeBoolean,
  normalizeNullableText,
  normalizeOrderIndex,
  normalizeThumbnail,
  normalizeTier,
  normalizeVisibility,
  parseJsonBody,
  requireAdmin
} from './program-utils';

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from('content_programs')
    .select(
      `
        *,
        content_sessions (
          id,
          title,
          visibility,
          order_index,
          member_area_content ( id )
        )
      `
    )
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (queryError) {
    return NextResponse.json({ error: queryError.message || 'programs_list_failed' }, { status: 500 });
  }

  const programs = (data || []).map((program) => {
    const sessions = Array.isArray(program?.content_sessions) ? program.content_sessions : [];
    return {
      ...program,
      sessions_count: sessions.length,
      aulas_count: sessions.reduce((total, session) => total + (session?.member_area_content?.length || 0), 0)
    };
  });

  return NextResponse.json({ programs });
}

export async function POST(request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body || {};

  const title = normalizeNullableText(body.title);
  const tierRequired = normalizeTier(body.tier_required, 'LIVRE');
  const visibility = normalizeVisibility(body.visibility, 'visible');
  const orderIndex = normalizeOrderIndex(body.order_index, 0);

  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 422 });
  if (!tierRequired) return NextResponse.json({ error: 'invalid_tier' }, { status: 422 });
  if (!visibility) return NextResponse.json({ error: 'invalid_visibility' }, { status: 422 });
  if (orderIndex === null) return NextResponse.json({ error: 'invalid_order_index' }, { status: 422 });

  const { data, error: insertError } = await supabase
    .from('content_programs')
    .insert({
      title,
      description: normalizeNullableText(body.description),
      thumbnail_url: normalizeThumbnail(body.thumbnail_url),
      tier_required: tierRequired,
      turma_exclusiva: normalizeNullableText(body.turma_exclusiva),
      visibility,
      is_published: normalizeBoolean(body.is_published, false),
      order_index: orderIndex
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'program_create_failed' }, { status: 500 });
  }

  return NextResponse.json({ program: data }, { status: 201 });
}
