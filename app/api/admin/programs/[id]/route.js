import { NextResponse } from 'next/server';
import {
  normalizeBoolean,
  normalizeId,
  normalizeNullableText,
  normalizeOrderIndex,
  normalizeThumbnail,
  normalizeTier,
  normalizeVisibility,
  parseJsonBody,
  requireAdmin
} from '../program-utils';

const ALLOWED_FIELDS = new Set([
  'title',
  'description',
  'thumbnail_url',
  'tier_required',
  'turma_exclusiva',
  'visibility',
  'is_published',
  'order_index'
]);

function mapProgram(data) {
  const sessions = [...(data?.content_sessions || [])]
    .map((session) => ({
      ...session,
      aulas: [...(session?.member_area_content || [])].sort(
        (a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0)
      )
    }))
    .sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));

  const { content_sessions: _contentSessions, ...program } = data || {};
  return { ...program, sessions };
}

export async function GET(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const programId = normalizeId(resolvedParams?.id);
  if (!programId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { data, error: queryError } = await supabase
    .from('content_programs')
    .select(
      `
        *,
        content_sessions (
          *,
          member_area_content ( * )
        )
      `
    )
    .eq('id', programId)
    .single();

  if (queryError || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ program: mapProgram(data) });
}

export async function PATCH(request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const programId = normalizeId(resolvedParams?.id);
  if (!programId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const updates = {};
  for (const [field, value] of Object.entries(parsed.body || {})) {
    if (!ALLOWED_FIELDS.has(field)) continue;

    if (field === 'title') {
      const normalized = normalizeNullableText(value);
      if (!normalized) return NextResponse.json({ error: 'title_required' }, { status: 422 });
      updates.title = normalized;
    }

    if (field === 'description') updates.description = normalizeNullableText(value);
    if (field === 'thumbnail_url') updates.thumbnail_url = normalizeThumbnail(value);

    if (field === 'tier_required') {
      const normalized = normalizeTier(value);
      if (!normalized) return NextResponse.json({ error: 'invalid_tier' }, { status: 422 });
      updates.tier_required = normalized;
    }

    if (field === 'turma_exclusiva') updates.turma_exclusiva = normalizeNullableText(value);

    if (field === 'visibility') {
      const normalized = normalizeVisibility(value);
      if (!normalized) return NextResponse.json({ error: 'invalid_visibility' }, { status: 422 });
      updates.visibility = normalized;
    }

    if (field === 'is_published') updates.is_published = normalizeBoolean(value, false);

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
    .from('content_programs')
    .update(updates)
    .eq('id', programId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'program_update_failed' }, { status: 500 });
  }

  return NextResponse.json({ program: data });
}

export async function DELETE(_request, { params }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const resolvedParams = await params;
  const programId = normalizeId(resolvedParams?.id);
  if (!programId) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const { error: deleteError } = await supabase.from('content_programs').delete().eq('id', programId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'program_delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
