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

function createLockedAccess(lockedReason = 'Conteúdo exclusivo', interestCta = 'Tenho interesse') {
  return {
    accessible: false,
    locked: true,
    locked_reason: lockedReason,
    access_label: '🔒 Acesso exclusivo',
    interest_cta: interestCta
  };
}

function resolveTierLockedAccess(requiredTier) {
  if (requiredTier === 'MOVIMENTO') {
    return createLockedAccess('Exclusivo da Mentoria em Grupo', 'Quero entrar para a Mentoria');
  }

  if (requiredTier === 'ACELERACAO') {
    return createLockedAccess('Exclusivo da Mentoria Individual', 'Quero a Mentoria Individual');
  }

  return createLockedAccess('Conteúdo exclusivo para mentorados', 'Quero saber mais');
}

function calcularAcessoPrograma(program, profile) {
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
    return createLockedAccess('Acesso exclusivo', 'Quero saber mais');
  } else if (program?.turma_exclusiva && !turmaOk) {
    return createLockedAccess(`Exclusivo da turma ${program.turma_exclusiva}`, 'Quero participar da próxima turma');
  } else if (!tierOk) {
    return resolveTierLockedAccess(program?.tier_required);
  }

  return createLockedAccess(lockedReason, interestCta);
}

function canCountAulaForProgress(aula, profile) {
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  return canAccessTier(aula?.tier_required, profile?.tier, isAdmin) && canAccessTurma(aula?.turma_exclusiva, profile?.turma, isAdmin);
}

function resolveLockedAccessFromAulas(aulas, profile) {
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  const turmaLocked = (aulas || []).find((aula) => splitTurmas(aula?.turma_exclusiva).length > 0 && !canAccessTurma(aula?.turma_exclusiva, profile?.turma, isAdmin));

  if (turmaLocked?.turma_exclusiva) {
    return createLockedAccess(`Exclusivo da turma ${turmaLocked.turma_exclusiva}`, 'Quero participar da próxima turma');
  }

  const tierLocked = (aulas || []).find((aula) => !canAccessTier(aula?.tier_required, profile?.tier, isAdmin));
  if (tierLocked) return resolveTierLockedAccess(tierLocked?.tier_required);

  return createLockedAccess(
    profile?.turma ? 'Conteúdo exclusivo para outra turma' : 'Exclusivo para alunos de uma turma ativa',
    'Tenho interesse'
  );
}

function getVisiblePublishedAulas(sessions) {
  return flattenSessionContent(sessions).filter((content) => content?.is_published && content?.visibility !== 'hidden');
}

function mapSessionsByProgramId(sessions) {
  const sessionsByProgramId = new Map();

  for (const session of sessions || []) {
    const programId = session?.program_id;
    if (!programId) continue;
    const current = sessionsByProgramId.get(programId) || [];
    current.push(session);
    sessionsByProgramId.set(programId, current);
  }

  return sessionsByProgramId;
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
          program_id,
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

  const programIds = (programs || []).map((program) => program?.id).filter(Boolean);
  let authenticatedSessions = [];

  if (programIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('content_sessions')
      .select(
        `
          id,
          program_id,
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
        `
      )
      .in('program_id', programIds)
      .neq('visibility', 'hidden')
      .order('order_index', { ascending: true });

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message || 'sessions_query_failed' }, { status: 500 });
    }

    authenticatedSessions = sessions || [];
  }

  const authenticatedSessionsByProgramId = mapSessionsByProgramId(authenticatedSessions);
  const programRows = (programs || []).map((program) => {
    const catalogSessions = program?.content_sessions || [];
    const userSessions = authenticatedSessionsByProgramId.get(program?.id) || [];
    const catalogAulas = getVisiblePublishedAulas(catalogSessions);
    const accessibleAulas = getVisiblePublishedAulas(userSessions).filter((content) => canCountAulaForProgress(content, profile));
    const programAccess = calcularAcessoPrograma(program, profile);
    const hasVisibleSessions = catalogSessions.some((session) => session?.visibility !== 'hidden') || userSessions.length > 0;
    const shouldLockEmptyAccessibleProgram = programAccess.accessible && hasVisibleSessions && accessibleAulas.length === 0;
    const access = shouldLockEmptyAccessibleProgram ? resolveLockedAccessFromAulas(catalogAulas, profile) : programAccess;

    return {
      program,
      catalogSessions,
      accessibleAulas,
      access
    };
  });

  const contentIds = programRows
    .filter((row) => row.access.accessible)
    .flatMap((row) => row.accessibleAulas)
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
  const programsWithProgress = programRows.map(({ program, catalogSessions, accessibleAulas, access }) => {
    const totalAulas = accessibleAulas.length;
    const aulasConcluidas = accessibleAulas.filter((content) => completedIds.has(content.id)).length;

    return {
      ...program,
      content_sessions: undefined,
      tier_usuario: profile?.tier || 'DESPERTAR',
      ...access,
      sessions_count: catalogSessions.filter((session) => session?.visibility !== 'hidden').length,
      total_aulas: access.accessible ? totalAulas : null,
      aulas_concluidas: access.accessible ? aulasConcluidas : null,
      progresso_pct: access.accessible && totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : null
    };
  });

  return NextResponse.json({ programs: programsWithProgress, tier_usuario: profile?.tier || 'DESPERTAR' });
}
