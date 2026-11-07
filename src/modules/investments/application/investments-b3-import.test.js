import { describe, expect, it, vi } from 'vitest';
vi.mock('./investments-coins', () => ({ awardInvestmentClaims: vi.fn() }));
vi.mock('./investments-valuation-service', () => ({ revalueUser: vi.fn() }));
import { importedPosition } from './investments-b3-import';

describe('aplicação da importação B3', () => {
  it('mapeia posição de bolsa para cotação B3', () => expect(importedPosition({ goal_id: 'g', asset_class: 'acao', name: 'ITSA4', ticker: 'ITSA4', institution: 'XP', quantity: 10, value: 120 }, 'u')).toMatchObject({ user_id: 'u', goal_id: 'g', ticker: 'ITSA4', pricing_method: 'b3_quote', current_value: 120, current_value_source: 'b3' }));
  it('mapeia CDB com garantia e curva CDI', () => expect(importedPosition({ goal_id: 'g', asset_class: 'renda_fixa_bancaria', name: 'CDB Banco A', indexer: 'cdi', quantity: 100, value: 105 }, 'u')).toMatchObject({ pricing_method: 'cdi_curve', guarantee: 'fgc', indexer: 'cdi' }));
});
