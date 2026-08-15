import { describe, expect, it } from 'vitest';
import {
  applyStructureOperation,
  isFuturePeriod,
  parseStructureOperation
} from './structure-sync-service';

describe('finance structure planned updates', () => {
  it('updates a simple item plan without changing its realized state', () => {
    const source = {
      receitas: [{
        nome: 'Salário 1',
        valor: '1000',
        valor_previsto: '1000',
        valor_realizado: '950',
        realized: true
      }],
      'pagar-primeiro': [],
      doar: [],
      contas: [],
      investimentos: [],
      desfrute: []
    };

    const result = applyStructureOperation(source, {
      type: 'update_category',
      bloco: 'receitas',
      oldName: 'Salário 1',
      nome: 'Pró-labore',
      valorPrevisto: '1500'
    });

    expect(result.changed).toBe(true);
    expect(result.data.receitas[0]).toMatchObject({
      nome: 'Pró-labore',
      valor: '1500',
      valor_previsto: '1500',
      valor_realizado: '950',
      realized: true
    });
  });

  it('updates a subcategory by group and previous name', () => {
    const source = {
      receitas: [],
      'pagar-primeiro': [],
      doar: [],
      contas: [{
        nome: 'Habitação',
        subcats: [{ nome: 'Aluguel', valor: '900', valor_previsto: '900', valor_realizado: '0', realized: false }]
      }],
      investimentos: [],
      desfrute: []
    };

    const result = applyStructureOperation(source, {
      type: 'update_subcategory',
      groupName: 'Habitação',
      oldName: 'Aluguel',
      nome: 'Condomínio',
      valorPrevisto: '650'
    });

    expect(result.changed).toBe(true);
    expect(result.data.contas[0].subcats[0]).toMatchObject({
      nome: 'Condomínio',
      valor: '650',
      valor_previsto: '650'
    });
  });

  it('falls back to the item position when a future month still has an older description', () => {
    const source = {
      receitas: [{ nome: 'Salário 1', valor: '0', valor_previsto: '0', valor_realizado: '0', realized: false }],
      'pagar-primeiro': [],
      doar: [],
      contas: [],
      investimentos: [],
      desfrute: []
    };

    const result = applyStructureOperation(source, {
      type: 'update_category',
      bloco: 'receitas',
      itemIndex: 0,
      oldName: 'Pró-labore antigo',
      nome: 'Pró-labore novo',
      valorPrevisto: '2500'
    });

    expect(result.changed).toBe(true);
    expect(result.data.receitas[0]).toMatchObject({
      nome: 'Pró-labore novo',
      valor_previsto: '2500'
    });
  });

  it('accepts planned update operations and rejects missing previous names', () => {
    expect(parseStructureOperation({
      type: 'update_category',
      bloco: 'receitas',
      oldName: 'Salário',
      nome: 'Pró-labore',
      valorPrevisto: '1000'
    }).ok).toBe(true);

    expect(parseStructureOperation({
      type: 'update_category',
      bloco: 'receitas',
      oldName: '',
      nome: 'Pró-labore',
      valorPrevisto: '1000'
    })).toEqual({ ok: false, reason: 'invalid_old_name' });
  });

  it('identifies only periods after the edited month', () => {
    expect(isFuturePeriod('09', '2026', '08', '2026')).toBe(true);
    expect(isFuturePeriod('08', '2026', '08', '2026')).toBe(false);
    expect(isFuturePeriod('07', '2026', '08', '2026')).toBe(false);
    expect(isFuturePeriod('01', '2027', '08', '2026')).toBe(true);
  });
});
