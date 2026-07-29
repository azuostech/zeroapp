import { describe, expect, it } from 'vitest';
import { reportHasRequiredSections } from '../domain/report-validation';

const validReport = `
**1. Abertura personalizada**
Texto.
**2. O padrão central identificado**
Texto.
**3. Como isso aparece no dia a dia**
Texto.
**4. A raiz**
Texto.
**5. O que sustenta esse padrão hoje**
Texto.
**6. Onde você quer chegar**
Texto.
**7. Reprogramação — Método Lucro Primeiro + Novos Hábitos**
- Movimento.
**8. Fechamento + convite**
Texto.
`;

describe('validação estrutural do relatório IRC', () => {
  it('exige as oito seções', () => {
    expect(reportHasRequiredSections(validReport)).toBe(true);
    expect(reportHasRequiredSections(validReport.replace('**8. Fechamento + convite**', ''))).toBe(false);
  });
});
