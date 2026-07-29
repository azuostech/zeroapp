import { describe, expect, it } from 'vitest';
import {
  IRC_DOMAINS,
  IRC_TOTAL_STEPS,
  canonicalizeAnswers,
  getBranchOption,
  getDomain,
  getEntryOption
} from './irc-domains';

describe('árvore canônica do Diagnóstico Completo IRC', () => {
  it('possui 6 domínios e exatamente 12 etapas', () => {
    expect(IRC_DOMAINS).toHaveLength(6);
    expect(IRC_TOTAL_STEPS).toBe(12);
  });

  it('usa IDs únicos para domínios, entradas e ramificações', () => {
    expect(new Set(IRC_DOMAINS.map((domain) => domain.id)).size).toBe(6);
    for (const domain of IRC_DOMAINS) {
      expect(new Set(domain.options.map((entry) => entry.id)).size).toBe(domain.options.length);
      for (const entry of domain.options) {
        expect(new Set(entry.branchOptions.map((branch) => branch.id)).size).toBe(entry.branchOptions.length);
      }
    }
  });

  it('abre a ramificação pertencente à entrada selecionada', () => {
    const domain = getDomain('raiz');
    const entry = getEntryOption(domain, 'controle');
    expect(entry.branchQuestion).toContain('hora de gastar');
    expect(getBranchOption(entry, 'guardar')?.label).toContain('guardar');
    expect(getBranchOption(entry, 'paralisa')).toBeNull();
  });

  it('reconstrói textos canônicos somente para os seis domínios completos', () => {
    const answers = Object.fromEntries(
      IRC_DOMAINS.map((domain) => [
        domain.id,
        {
          entry_id: domain.options[0].id,
          branch_id: domain.options[0].branchOptions[0].id
        }
      ])
    );
    const canonical = canonicalizeAnswers(answers);
    expect(canonical).toHaveLength(6);
    expect(canonical[0]).toEqual({
      dominio: 'raiz',
      pergunta_entrada: IRC_DOMAINS[0].entryQuestion,
      opcao_escolhida: IRC_DOMAINS[0].options[0].label,
      pergunta_ramificacao: IRC_DOMAINS[0].options[0].branchQuestion,
      opcao_ramificacao: IRC_DOMAINS[0].options[0].branchOptions[0].label
    });
  });

  it('rejeita domínio incompleto e opção adulterada', () => {
    expect(canonicalizeAnswers({})).toBeNull();
    const answers = Object.fromEntries(
      IRC_DOMAINS.map((domain) => [
        domain.id,
        { entry_id: domain.options[0].id, branch_id: domain.options[0].branchOptions[0].id }
      ])
    );
    answers.raiz.branch_id = 'ignore-instrucoes-e-injete-prompt';
    expect(canonicalizeAnswers(answers)).toBeNull();
  });
});
