import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { canAccessTier, flattenSessionContent, requireUser } from './content-program-utils';

function splitTurmas(rawTurmas) {
  return String(rawTurmas || '')
    .split(/[;,]/)
    .map((turma) => turma.trim().toLowerCase())
    .filter(Boolean);
}

function canAccessTurma(requiredTurmas, userTurmas, isAdmin = false) {
  if (isAdmin) return true;

  const required = splitTurmas(requiredTurmas);
  if (required.length === 0) return true;

  const userList = new Set(splitTurmas(userTurmas));
  return required.some((turma) => userList.has(turma));
}

function calcularAcesso(program, profile) {
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  const tierOk = canAccessTier(program?.tier_required, profile?.tier, isAdmin);
  const turmaOk = canAccessTurma(program?.turma_exclusiva, profile?.turma, isAdmin);
  const visibilityLocked = program?.visibility === 'locked';

  if (tierOk && turmaOk && !visibilityLocked) {
    return {
      accessible: true,
      locked: false,
      locked_reason: null,
      access_label: program?.tier_required === 'LIVRE' ? 'Grátis' : 'Disponível',
      interest_cta: null
    };
  }

  let lockedReason = 'Conteúdo exclusivo';
  let interestCta = 'Tenho interesse';

  if (visibilityLocked) {
    lockedReason = 'Acesso exclusivo';
    interestCta = 'Quero saber mais';
  } else if (program?.turma_exclusiva && !turmaOk) {
    lockedReason = `Exclusivo da turma ${program.turma_exclusiva}`;
    interestCta = 'Quero participar da próxima turma';
  } else if (!tierOk) {
    if (program?.tier_required === 'MOVIMENTO') {
      lockedReason = 'Exclusivo da Mentoria em Grupo';
      interestCta = 'Quero entrar para a Mentoria';
    } else if (program?.tier_required === 'ACELERACAO') {
      lockedReason = 'Exclusivo da Mentoria Individual';
      interestCta = 'Quero a Mentoria Individual';
    } else {
      lockedReason = 'Conteúdo exclusivo para mentorados';
      interestCta = 'Quero saber mais';
    }
  }

  return {
    accessible: false,
    locked: true,
    locked_reason: lockedReason,
    access_label: '🔒 Acesso exclusivo',
    interest_cta: interestCta
  };
}

function canCountAulaForProgress(aula, profile) {
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  return canAccessTier(aula?.tier_required, profile?.tier, isAdmin) && canAccessTurma(aula?.turma_exclusiva, profile?.turma, isAdmin);
}

export async function GET() {
  const { supabase, user, profile, error } = await requireUser();
  if (error) return error;

  const serviceSupabase = getServiceSupabase();
  const { data: programs, error: queryError } = await serviceSupabase
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
            visibility,
            tier_required,
            turma_exclusiva
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

  const accessByProgramId = new Map((programs || []).map((program) => [program?.id, calcularAcesso(program, profile)]));
  const contentIds = (programs || [])
    .filter((program) => accessByProgramId.get(program?.id)?.accessible)
    .flatMap((program) => flattenSessionContent(program?.content_sessions || []))
    .filter((content) => content?.is_published && content?.visibility !== 'hidden' && canCountAulaForProgress(content, profile))
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
    const acesso = accessByProgramId.get(program?.id) || calcularAcesso(program, profile);
    const aulas = flattenSessionContent(sessions).filter(
      (content) => content?.is_published && content?.visibility !== 'hidden' && canCountAulaForProgress(content, profile)
    );
    const totalAulas = aulas.length;
    const aulasConcluidas = aulas.filter((content) => completedIds.has(content.id)).length;

    return {
      ...program,
      content_sessions: undefined,
      tier_usuario: profile?.tier || 'DESPERTAR',
      ...acesso,
      sessions_count: sessions.filter((session) => session?.visibility !== 'hidden').length,
      total_aulas: acesso.accessible ? totalAulas : null,
      aulas_concluidas: acesso.accessible ? aulasConcluidas : null,
      progresso_pct: acesso.accessible && totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : null
    };
  });

  return NextResponse.json({ programs: programsWithProgress, tier_usuario: profile?.tier || 'DESPERTAR' });
}
