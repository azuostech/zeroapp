import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { fetchBcbSeries } from './bcb-sgs';
import { fetchBrapiQuotes } from './brapi';
import { fetchCvmQuotes } from './cvm';
import { fetchTesouroPrices } from './tesouro';

describe('fontes de mercado', () => {
  it('normaliza resposta do SGS', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ data: '02/01/2026', valor: '0,055131' }])));
    const result = await fetchBcbSeries({ series: 'cdi', from: '2026-01-01', to: '2026-01-03', fetchImpl });
    expect(result).toEqual({ rows: [{ series: 'cdi', ref_date: '2026-01-02', value: 0.055131 }], errors: [] });
  });

  it('trata token ausente da brapi sem lançar', async () => {
    expect(await fetchBrapiQuotes(['PETR4'], { token: '' })).toEqual({ rows: [], errors: ['brapi_token_missing'] });
  });

  it('lê o CSV real do Tesouro por cabeçalho e retém a data mais nova', async () => {
    const csv = 'Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha\nTesouro Selic;01/03/2029;29/10/2026;0,06;0,07;20100,00;20090,00;20090,00\nTesouro IPCA+;15/05/2035;30/10/2026;7,01;7,10;1500,00;1490,50;1492,00\n';
    const result = await fetchTesouroPrices({ url: 'https://example.test/tesouro.csv', fetchImpl: async () => new Response(csv) });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ source: 'tesouro', symbol: 'Tesouro IPCA+|15/05/2035', quote_date: '2026-10-30', price: 1490.5 });
  });

  it('aceita CNPJ_FUNDO_CLASSE no ZIP atual da CVM', async () => {
    const csv = 'TP_FUNDO_CLASSE;CNPJ_FUNDO_CLASSE;DT_COMPTC;VL_QUOTA\nCLASSES - FIF;00.017.024/0001-53;2026-10-01;44.99\nCLASSES - FIF;00.017.024/0001-53;2026-10-02;45.01\n';
    const zipped = zipSync({ 'inf_diario_fi_202610.csv': strToU8(csv) });
    const result = await fetchCvmQuotes({ cnpjs: ['00017024000153'], month: '2026-10', fetchImpl: async () => new Response(zipped) });
    expect(result.rows).toEqual([{ source: 'cvm', symbol: '00017024000153', quote_date: '2026-10-02', price: 45.01, meta: { month: '2026-10' } }]);
  });
});
