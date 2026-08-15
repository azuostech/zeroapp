import { describe, expect, it } from 'vitest';
import { buildAnnualFinancialSummary } from './annual-summary-service';
import { buildAnnualSummaryPdf, buildAnnualSummaryXlsx } from './annual-summary-export';

function realized(nome, value) {
  return { nome, realized: true, valor_realizado: value, valor_previsto: '99999', valor: '99999' };
}

function fixture() {
  return buildAnnualFinancialSummary({
    year: '2026',
    rows: [{
      month: '05',
      data: {
        receitas: [realized('Salário', '15000')],
        'pagar-primeiro': [realized('Reserva', '1500')],
        doar: [realized('Doação', '500')],
        contas: [{ nome: 'Habitação', subcats: [realized('Aluguel', '3500')] }],
        investimentos: [realized('Carteira', '2000')],
        desfrute: [realized('Lazer', '1000')]
      }
    }]
  });
}

function storedZipEntries(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    entries.set(name, buffer.subarray(dataStart, dataStart + size).toString('utf8'));
    offset = dataStart + size;
  }
  return entries;
}

describe('annual summary exports', () => {
  it('creates a valid OpenXML workbook package with summary and detail sheets', () => {
    const buffer = buildAnnualSummaryXlsx({ summary: fixture(), clientName: 'Cliente Teste' });
    const entries = storedZipEntries(buffer);

    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(entries.has('[Content_Types].xml')).toBe(true);
    expect(entries.get('xl/workbook.xml')).toContain('Resumo anual');
    expect(entries.get('xl/workbook.xml')).toContain('Lançamentos');
    expect(entries.get('xl/worksheets/sheet1.xml')).toContain('Resumo Financeiro Anual');
    expect(entries.get('xl/worksheets/sheet2.xml')).toContain('Habitação / Aluguel');
    expect(entries.get('xl/worksheets/sheet2.xml')).not.toContain('99999');
  });

  it('creates a multipage PDF report', async () => {
    const buffer = await buildAnnualSummaryPdf({ summary: fixture(), clientName: 'Cliente Teste' });

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(4000);
    expect(buffer.toString('latin1')).toContain('/Type /Page');
    expect(buffer.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(7);
  });
});
