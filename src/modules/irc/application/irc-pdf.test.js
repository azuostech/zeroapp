import { describe, expect, it } from 'vitest';
import { buildIrcPdf, parseIrcReport } from './irc-pdf';
import { IRC_DOMAINS } from '../domain/irc-domains';

describe('PDF do Diagnóstico Completo', () => {
  it('gera um PDF a partir do relatório persistido', async () => {
    const headings = [
      'Abertura personalizada',
      'O padrão central identificado',
      'Como isso aparece no dia a dia',
      'A raiz',
      'O que sustenta esse padrão hoje',
      'Onde você quer chegar',
      'Reprogramação — Método Finanças do Zero + Novos Hábitos',
      'Fechamento + convite'
    ];
    const report = headings.map((heading, index) => (
      `**${index + 1}. ${heading}**\n${index === 6 ? '- Abra o extrato e nomeie tudo. Movimento concreto.' : 'Leitura personalizada do padrão financeiro. '.repeat(22)}`
    )).join('\n\n');
    const answers = Object.fromEntries(IRC_DOMAINS.map((domain) => [
      domain.id,
      { entry_id: domain.options[0].id, branch_id: domain.options[0].branchOptions[0].id }
    ]));
    const pdf = await buildIrcPdf({
      name: 'Pessoa Teste',
      report,
      answers,
      generatedAt: '2026-07-29T12:00:00.000Z'
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(15000);
  });

  it('renomeia o método em relatórios antigos sem perder o conteúdo', () => {
    const sections = parseIrcReport('**7. Reprogramação — Método Lucro Primeiro + Novos Hábitos**\n- Nomeie tudo. Texto completo.');
    expect(sections[0].heading).toContain('Método Finanças do Zero');
    expect(sections[0].items[0]).toEqual({ title: 'Nomeie tudo.', text: 'Texto completo.' });
  });
});
