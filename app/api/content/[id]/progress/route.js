import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { canAccessContentItem } from '../../programs/content-program-utils';

async function requireAccessibleContent(supabase, contentId, profile) {
  const { data: content, error } = await supabase
    .from('member_area_content')
    .select('id,is_published,visibility,tier_required,turma_exclusiva,disponivel_em')
    .eq('id', contentId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message || 'content_lookup_failed' }, { status: 500 }) };
  }

  if (!content) {
    return { error: NextResponse.json({ error: 'content_not_found' }, { status: 404 }) };
  }

  if (!canAccessContentItem(content, profile)) {
    return { error: NextResponse.json({ error: 'content_access_denied' }, { status: 403 }) };
  }

  return { content };
}

export async function POST(_request, { params }) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const contentId = String(resolvedParams?.id || '').trim();
  if (!contentId) return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });

  const access = await requireAccessibleContent(supabase, contentId, profile);
  if (access.error) return access.error;

  const { data, error } = await supabase
    .from('content_progress')
    .upsert(
      {
        user_id: user.id,
        content_id: contentId,
        started_at: new Date().toISOString()
      },
      { onConflict: 'user_id,content_id', ignoreDuplicates: true }
    )
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message || 'progress_start_failed' }, { status: 500 });
  }

  return NextResponse.json({ progress: data || null, started: true, success: true });
}

export async function GET(_request, { params }) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const contentId = String(resolvedParams?.id || '').trim();
  if (!contentId) return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });

  const access = await requireAccessibleContent(supabase, contentId, profile);
  if (access.error) return access.error;

  const { data, error } = await supabase
    .from('content_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || 'progress_query_failed' }, { status: 500 });
  }

  return NextResponse.json({
    progress: data || null,
    status: data?.completed_at ? 'completed' : data?.started_at ? 'in_progress' : 'not_started'
  });
}
