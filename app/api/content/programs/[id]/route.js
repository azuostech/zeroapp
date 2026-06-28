import { NextResponse } from 'next/server';
import {
  canAccessTier,
  canAccessTurma,
  isAvailableToday,
  mapProgressByContent,
  normalizeId,
  requireUser
} from '../content-program-utils';

function sortByOrder(items) {
  return [...(items || [])].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
}

function mapAula(aula, progress, profile, isAdmin) {
  const lockedByTier = !canAccessTier(aula?.tier_required, profile?.tier, isAdmin);
  const lockedByTurma = !canAccessTurma(aula?.turma_exclusiva, profile?.turma, isAdmin);
  const lockedByVisibility = aula?.visibility === 'locked';
  const lockedByDate = !isAvailableToday(aula?.disponivel_em);
  const locked = lockedByTier || lockedByTurma || lockedByVisibility || lockedByDate;

  let lockedReason = null;
  if (lockedByVisibility) lockedReason = 'Conteúdo bloqueado';
  else if (lockedByDate) lockedReason = 'Ainda não disponível';
  else if (lockedByTurma) lockedReason = 'Conteúdo exclusivo para alunos';
  else if (lockedByTier) lockedReason = `Disponível na fase ${aula?.tier_required || 'superior'}`;

  return {
    ...aula,
    url: locked ? null : aula?.url || null,
    locked,
    locked_reason: lockedReason,
    progress: progress || null
  };
}

export async function GET(_request, { params }) {
  const { supabase, user, profile, error } = await requireUser();
  if (error) return error;

  const resolvedParams = await params;
  const programId = normalizeId(resolvedParams?.id);
  if (!programId) return NextResponse.json({ error: 'invalid_program_id' }, { status: 400 });

  const { data: program, error: programError } = await supabase
    .from('content_programs')
    .select('*')
    .eq('id', programId)
    .eq('is_published', true)
    .neq('visibility', 'hidden')
    .single();

  if (programError || !program) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin' || profile?.is_admin === true;
  const programLocked =
    program?.visibility === 'locked' ||
    !canAccessTier(program?.tier_required, profile?.tier, isAdmin) ||
    !canAccessTurma(program?.turma_exclusiva, profile?.turma, isAdmin);

  if (programLocked) {
    return NextResponse.json({ error: 'program_access_denied' }, { status: 403 });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from('content_sessions')
    .select(
      `
        *,
        member_area_content (
          id,
          title,
          description,
          content_type,
          tier_required,
          url,
          thumbnail_url,
          order_index,
          is_published,
          turma_exclusiva,
          disponivel_em,
          session_id,
          visibility
        )
      `
    )
    .eq('program_id', programId)
    .neq('visibility', 'hidden')
    .order('order_index', { ascending: true });

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message || 'sessions_query_failed' }, { status: 500 });
  }

  const aulas = (sessions || [])
    .flatMap((session) => session?.member_area_content || [])
    .filter((aula) => aula?.is_published && aula?.visibility !== 'hidden');
  const aulaIds = aulas.map((aula) => aula.id);

  let progressRows = [];
  if (aulaIds.length > 0) {
    const { data: progress, error: progressError } = await supabase
      .from('content_progress')
      .select('content_id, started_at, completed_at')
      .eq('user_id', user.id)
      .in('content_id', aulaIds);

    if (progressError) {
      return NextResponse.json({ error: progressError.message || 'progress_query_failed' }, { status: 500 });
    }
    progressRows = progress || [];
  }

  const progressByContent = mapProgressByContent(progressRows);
  const mappedSessions = sortByOrder(sessions).map((session) => {
    const sessionAulas = sortByOrder(session?.member_area_content || [])
      .filter((aula) => aula?.is_published && aula?.visibility !== 'hidden')
      .map((aula) => mapAula(aula, progressByContent.get(aula.id) || null, profile, isAdmin));
    const completed = sessionAulas.filter((aula) => aula?.progress?.completed_at).length;

    return {
      ...session,
      member_area_content: undefined,
      aulas: sessionAulas,
      total_aulas: sessionAulas.length,
      aulas_concluidas: completed
    };
  });

  const totalAulas = mappedSessions.reduce((total, session) => total + Number(session?.total_aulas || 0), 0);
  const aulasConcluidas = mappedSessions.reduce((total, session) => total + Number(session?.aulas_concluidas || 0), 0);

  return NextResponse.json({
    program: {
      ...program,
      tier_usuario: profile?.tier || 'DESPERTAR',
      sessions_count: mappedSessions.length,
      total_aulas: totalAulas,
      aulas_concluidas: aulasConcluidas,
      progresso_pct: totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0
    },
    sessions: mappedSessions
  });
}
