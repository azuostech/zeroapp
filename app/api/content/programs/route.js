import { NextResponse } from 'next/server';
import { flattenSessionContent, requireUser } from './content-program-utils';

export async function GET() {
  const { supabase, user, profile, error } = await requireUser();
  if (error) return error;

  const { data: programs, error: queryError } = await supabase
    .from('content_programs')
    .select(
      `
        *,
        content_sessions (
          id,
          title,
          visibility,
          order_index,
          member_area_content (
            id,
            is_published,
            visibility
          )
        )
      `
    )
    .eq('is_published', true)
    .neq('visibility', 'hidden')
    .order('order_index', { ascending: true });

  if (queryError) {
    return NextResponse.json({ error: queryError.message || 'programs_query_failed' }, { status: 500 });
  }

  const contentIds = flattenSessionContent((programs || []).flatMap((program) => program?.content_sessions || []))
    .filter((content) => content?.is_published && content?.visibility !== 'hidden')
    .map((content) => content.id);

  let progressRows = [];
  if (contentIds.length > 0) {
    const { data: progress, error: progressError } = await supabase
      .from('content_progress')
      .select('content_id, started_at, completed_at')
      .eq('user_id', user.id)
      .in('content_id', contentIds);

    if (progressError) {
      return NextResponse.json({ error: progressError.message || 'progress_query_failed' }, { status: 500 });
    }
    progressRows = progress || [];
  }

  const completedIds = new Set(progressRows.filter((item) => item?.completed_at).map((item) => item.content_id));
  const programsWithProgress = (programs || []).map((program) => {
    const sessions = program?.content_sessions || [];
    const aulas = flattenSessionContent(sessions).filter((content) => content?.is_published && content?.visibility !== 'hidden');
    const totalAulas = aulas.length;
    const aulasConcluidas = aulas.filter((content) => completedIds.has(content.id)).length;

    return {
      ...program,
      content_sessions: undefined,
      tier_usuario: profile?.tier || 'DESPERTAR',
      sessions_count: sessions.filter((session) => session?.visibility !== 'hidden').length,
      total_aulas: totalAulas,
      aulas_concluidas: aulasConcluidas,
      progresso_pct: totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0
    };
  });

  return NextResponse.json({ programs: programsWithProgress, tier_usuario: profile?.tier || 'DESPERTAR' });
}
