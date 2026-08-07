export function isAdminProfile(profile) {
  return profile?.role === 'admin' || profile?.is_admin === true;
}

export function hasAssignedTurma(profile) {
  return String(profile?.turma || '').trim().length > 0;
}

export function profileHasTurma(profile, requiredTurma) {
  const required = String(requiredTurma || '').trim().toLocaleLowerCase('pt-BR');
  if (!required) return false;
  return String(profile?.turma || '')
    .split(/[;,]/)
    .map((turma) => turma.trim().toLocaleLowerCase('pt-BR'))
    .filter(Boolean)
    .includes(required);
}

export function hasDiagnosticAccess(profile) {
  return isAdminProfile(profile) || profileHasTurma(profile, 'diagnostico');
}

export function hasStudentAccess(profile) {
  if (isAdminProfile(profile)) return true;
  return String(profile?.turma || '')
    .split(/[;,]/)
    .map((turma) => turma.trim().toLocaleLowerCase('pt-BR'))
    .filter(Boolean)
    .some((turma) => turma !== 'diagnostico');
}
