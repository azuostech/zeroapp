export function isAdminProfile(profile) {
  return profile?.role === 'admin' || profile?.is_admin === true;
}

export function hasAssignedTurma(profile) {
  return String(profile?.turma || '').trim().length > 0;
}

export function hasStudentAccess(profile) {
  return isAdminProfile(profile) || hasAssignedTurma(profile);
}
