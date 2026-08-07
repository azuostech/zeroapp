import { describe, expect, it } from 'vitest';
import { hasDiagnosticAccess, hasStudentAccess, profileHasTurma } from './access';

describe('regras de acesso por turma', () => {
  it('reconhece diagnostico sem diferenciar caixa e em lista multiturma', () => {
    expect(profileHasTurma({ turma: 'Maio 2026, Diagnostico' }, 'diagnostico')).toBe(true);
  });

  it('libera a planilha para a turma diagnostico', () => {
    expect(hasDiagnosticAccess({ role: 'user', turma: 'diagnostico' })).toBe(true);
    expect(hasDiagnosticAccess({ role: 'user', turma: 'Workshop' })).toBe(false);
  });

  it('não libera áreas de mentoria para quem possui apenas a turma diagnostico', () => {
    expect(hasStudentAccess({ role: 'user', turma: 'diagnostico' })).toBe(false);
    expect(hasStudentAccess({ role: 'user', turma: 'Maio 2026, diagnostico' })).toBe(true);
  });
});
