import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY_RULES } from './investments.constants';
import { goalInputSchema, movementInputSchema, policyInputSchema, positionInputSchema, pricingMethodFor } from './investments.validation';

describe('validação de investimentos', () => {
  it('exige meta e data futura em objetivo com prazo', () => expect(goalInputSchema.safeParse({ kind: 'objetivo_prazo', name: 'Viagem' }).success).toBe(false));
  it('deriva o método de precificação', () => {
    const result = positionInputSchema.parse({ goal_id: '00000000-0000-4000-8000-000000000001', form_type: 'bancaria', asset_class: 'renda_fixa_bancaria', name: 'CDB', indexer: 'cdi', guarantee: 'fgc', first_contribution: { amount: '300', occurred_on: '2026-01-01' } });
    expect(result.pricing_method).toBe('cdi_curve');
  });
  it('exige motivo e sentimento no resgate', () => expect(movementInputSchema.safeParse({ kind: 'resgate', amount: 100, occurred_on: '2026-01-01' }).success).toBe(false));
  it('aceita ajuste negativo', () => expect(movementInputSchema.parse({ kind: 'ajuste', amount: '-25,50', occurred_on: '2026-01-01' }).amount).toBe(-25.5));
  it('aceita a política padrão', () => expect(policyInputSchema.safeParse({ rules: DEFAULT_POLICY_RULES }).success).toBe(true));
  it('recalcula o método quando classe ou indexador muda', () => {
    expect(pricingMethodFor({ asset_class: 'renda_fixa_bancaria', indexer: 'ipca' })).toBe('ipca_curve');
    expect(pricingMethodFor({ asset_class: 'fundo', cnpj: null })).toBe('manual');
  });
});
