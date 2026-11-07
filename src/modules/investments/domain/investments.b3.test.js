import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import { parseB3Position, reconcileImport } from './investments.b3';

async function fixtureSheets() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(fileURLToPath(new URL('./__fixtures__/b3-posicao-exemplo.xlsx', import.meta.url)));
  return workbook.worksheets.map((sheet) => ({ name: sheet.name, rows: Array.from({ length: sheet.rowCount }, (_, index) => sheet.getRow(index + 1).values.slice(1)) }));
}

describe('importação da posição B3', () => {
  it('lê as abas e cabeçalhos reais sem importar totais', async () => {
    const parsed = parseB3Position({ sheets: await fixtureSheets() });
    expect(parsed.warnings).toEqual([]);
    expect(parsed.items).toHaveLength(6);
    expect(parsed.items.map((item) => item.asset_class)).toEqual(['acao', 'bdr', 'fii', 'renda_fixa_bancaria', 'renda_fixa_bancaria', 'tesouro']);
    expect(parsed.items.find((item) => item.ticker === 'SAPR3')).toMatchObject({ quantity: 1, value: 6.37 });
    expect(parsed.items.find((item) => item.tesouro_code === 'BRSTNCNTB666')).toMatchObject({ indexer: 'ipca', maturity_date: '2040-08-15', value: 17.32 });
    expect(parsed.items.filter((item) => item.asset_class === 'renda_fixa_bancaria').map((item) => item.value)).toEqual([1, 349.24]);
  });

  it('avisa sobre aba desconhecida', () => expect(parseB3Position({ sheets: [{ name: 'Resumo', rows: [['Total']] }] }).warnings).toEqual([{ sheet: 'Resumo', reason: 'unrecognized' }]));

  it('concilia por ticker, código do Tesouro e renda fixa manual parecida', () => {
    const result = reconcileImport({ items: [
      { id: '1', asset_class: 'acao', ticker: 'ITSA4', quantity: 10 },
      { id: '2', asset_class: 'tesouro', tesouro_code: 'ABC', quantity: 1 },
      { id: '3', asset_class: 'renda_fixa_bancaria', name: 'CDB Banco A', institution: 'Banco A', maturity_date: '2028-06-15', quantity: 100 },
      { id: '4', asset_class: 'bdr', ticker: 'ROXO34', quantity: 1 }
    ], positions: [
      { id: 'p1', asset_class: 'acao', ticker: 'ITSA4', quantity: 8 },
      { id: 'p2', asset_class: 'tesouro', tesouro_code: 'ABC', quantity: 1 },
      { id: 'p3', asset_class: 'renda_fixa_bancaria', name: 'Outro CDB', institution: 'Banco A', maturity_date: '2028-06-30', quantity: 100, pricing_method: 'manual' }
    ] });
    expect(result.map((item) => item.status)).toEqual(['ATUALIZAR', 'IGUAL', 'CONFIRMAR', 'NOVO']);
  });
});
