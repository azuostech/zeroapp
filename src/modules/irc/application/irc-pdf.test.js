import { describe, expect, it } from 'vitest';
import { buildIrcPdf } from './irc-pdf';

describe('PDF do Diagnóstico Completo', () => {
  it('gera um PDF a partir do relatório persistido', async () => {
    const report = Array.from({ length: 8 }, (_, index) => (
      `**${index + 1}. Seção ${index + 1}**\n${'Leitura personalizada do padrão financeiro. '.repeat(35)}`
    )).join('\n\n');
    const pdf = await buildIrcPdf({
      name: 'Pessoa Teste',
      report,
      generatedAt: '2026-07-29T12:00:00.000Z'
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(5000);
  });
});
