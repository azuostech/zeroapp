export function reportHasRequiredSections(report) {
  const normalized = String(report || '').toLocaleLowerCase('pt-BR');
  const required = [
    'abertura personalizada',
    'padrão central identificado',
    'como isso aparece no dia a dia',
    'a raiz',
    'o que sustenta esse padrão hoje',
    'onde você quer chegar',
    'reprogramação',
    'fechamento'
  ];
  return required.every((heading) => normalized.includes(heading));
}
