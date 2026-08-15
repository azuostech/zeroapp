import { describe, expect, it } from 'vitest';
import { buildAnnualFinancialSummary } from './annual-summary-service';

function item(nome, valorRealizado, realized = true, valorPrevisto = '9999') {
  return {
    nome,
    valor: valorPrevisto,
    valor_previsto: valorPrevisto,
    valor_realizado: valorRealizado,
    realized
  };
}

describe('annual financial summary', () => {
  it('aggregates only realized values by month, block and year', () => {
    const summary = buildAnnualFinancialSummary({
      year: '2026',
      rows: [
        {
          month: '01',
          data: {
            receitas: [item('Salário', '10000'), item('Pendente', '5000', false)],
            'pagar-primeiro': [item('Reserva', '1000')],
            doar: [item('Doação', '500')],
            contas: [{ nome: 'Habitação', subcats: [item('Aluguel', '3000')] }],
            investimentos: [item('Carteira', '1000')],
            desfrute: [item('Lazer', '500')]
          }
        },
        {
          month: '02',
          data: {
            receitas: [item('Salário', '12000')],
            'pagar-primeiro': [item('Reserva', '1200')],
            doar: [],
            contas: [{ nome: 'Habitação', subcats: [item('Aluguel', '3000')] }],
            investimentos: [],
            desfrute: []
          }
        }
      ]
    });

    const receitas = summary.blocks.find((block) => block.key === 'receitas');
    const contas = summary.blocks.find((block) => block.key === 'contas');

    expect(receitas.monthly['01']).toBe(10000);
    expect(receitas.total).toBe(22000);
    expect(receitas.revenuePercentage).toBe(100);
    expect(receitas.entries).toHaveLength(1);
    expect(contas.total).toBe(6000);
    expect(contas.entries[0]).toMatchObject({ label: 'Aluguel', groupLabel: 'Habitação', total: 6000 });
    expect(summary.totals.expenses).toBe(10200);
    expect(summary.totals.balance).toBe(11800);
  });

  it('handles Brazilian money strings and zero revenue without invalid percentages', () => {
    const summary = buildAnnualFinancialSummary({
      year: '2026',
      rows: [{
        month: '05',
        data: {
          receitas: [],
          'pagar-primeiro': [],
          doar: [],
          contas: [{ nome: 'Cartões', subcats: [item('Cartão', '1.234,56')] }],
          investimentos: [],
          desfrute: []
        }
      }]
    });

    expect(summary.blocks.find((block) => block.key === 'contas').total).toBe(1234.56);
    expect(summary.totals.expensePercentage).toBe(0);
    expect(summary.totals.balancePercentage).toBe(0);
  });

  it('never substitutes a planned value when the realized amount is absent', () => {
    const summary = buildAnnualFinancialSummary({
      year: '2026',
      rows: [{
        month: '05',
        data: {
          receitas: [{ nome: 'Receita', valor_previsto: '5000', realized: true }],
          'pagar-primeiro': [],
          doar: [],
          contas: [],
          investimentos: [],
          desfrute: []
        }
      }]
    });

    expect(summary.totals.revenue).toBe(0);
  });
});
