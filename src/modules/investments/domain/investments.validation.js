import { z } from 'zod';
import { ASSET_CLASSES, DEFAULT_POLICY_RULES, FEELINGS, FORM_TYPES, RESGATE_REASONS } from './investments.constants';
import { parseBRL, parsePercent } from '../../patrimony/domain/patrimony.money';

const today = () => new Date().toISOString().slice(0, 10);
const optionalText = (max) => z.string().trim().max(max).optional().nullable().transform((value) => value || null);
const money = z.union([z.string(), z.number()]).transform(parseBRL).refine((value) => value != null, 'Valor inválido');
const optionalMoney = z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : parseBRL(value)).refine((value) => value == null || value >= 0, 'Valor inválido');
const optionalNumber = z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : Number(String(value).replace(',', '.'))).refine((value) => value == null || Number.isFinite(value), 'Número inválido');
const optionalDate = z.string().date().optional().nullable().transform((value) => value || null);
const signedMoney = z.union([z.string(), z.number()]).transform((input) => {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) / 100 : null;
  let value = input.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}).refine((value) => value != null, 'Valor inválido');

export const goalInputSchema = z.object({
  kind: z.enum(['reserva_liquidez', 'objetivo_prazo', 'independencia']),
  name: z.string().trim().min(1).max(60), target_amount: optionalMoney, target_date: optionalDate
}).superRefine((value, context) => {
  if (value.kind === 'objetivo_prazo' && !(value.target_amount > 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['target_amount'], message: 'Informe a meta' });
  if (value.kind === 'objetivo_prazo' && !value.target_date) context.addIssue({ code: z.ZodIssueCode.custom, path: ['target_date'], message: 'Informe a data' });
  if (value.target_date && value.target_date <= today()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['target_date'], message: 'Use uma data futura' });
});

const firstContributionSchema = z.object({ amount: money, occurred_on: z.string().date(), decision_note: optionalText(500) });
const positionBaseSchema = z.object({
  goal_id: z.string().uuid(), form_type: z.enum(FORM_TYPES.map((item) => item.key)), asset_class: z.enum(Object.keys(ASSET_CLASSES)),
  product: optionalText(40), name: z.string().trim().min(1).max(80),
  ticker: optionalText(12).transform((value) => value?.toUpperCase() || null), institution: optionalText(80),
  cnpj: optionalText(30).transform((value) => value ? value.replace(/\D/g, '') : null), tesouro_code: optionalText(80),
  indexer: z.enum(['cdi', 'selic', 'pre', 'ipca', 'igpm', 'nenhum']).optional().nullable(), rate: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : parsePercent(value)),
  quantity: optionalNumber.refine((value) => value == null || value >= 0, 'Quantidade inválida'), current_balance: optionalMoney, liquidity_days: optionalNumber.refine((value) => value == null || Number.isInteger(value) && value >= 0 && value <= 3650, 'Liquidez inválida'),
  redeemable_from: optionalDate, maturity_date: optionalDate,
  guarantee: z.enum(['fgc', 'tesouro', 'nenhuma', 'desconhecida']).default('desconhecida'), risk_flags: z.array(z.string().max(40)).default([]), manual_value: optionalMoney,
  first_contribution: firstContributionSchema
});

export const positionInputSchema = positionBaseSchema.superRefine((value, context) => {
  if (value.cnpj && value.cnpj.length !== 14) context.addIssue({ code: z.ZodIssueCode.custom, path: ['cnpj'], message: 'CNPJ deve ter 14 dígitos' });
  if (['acao', 'fii', 'etf', 'bdr'].includes(value.asset_class) && !/^[A-Z0-9]{4,12}$/.test(value.ticker || '')) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ticker'], message: 'Ticker inválido' });
  if (value.first_contribution.occurred_on > today()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['first_contribution', 'occurred_on'], message: 'A data não pode ser futura' });
}).transform((value) => {
  let pricingMethod = ASSET_CLASSES[value.asset_class].defaultPricing;
  if (['renda_fixa_bancaria', 'debenture_cri_cra'].includes(value.asset_class)) pricingMethod = ({ cdi: 'cdi_curve', selic: 'selic_curve', pre: 'pre_curve', ipca: 'ipca_curve' })[value.indexer] || 'manual';
  if (['fundo', 'previdencia'].includes(value.asset_class) && !value.cnpj) pricingMethod = 'manual';
  return { ...value, pricing_method: pricingMethod };
});

export const movementInputSchema = z.object({
  kind: z.enum(['aporte', 'resgate', 'vencimento', 'provento', 'ajuste']), amount: signedMoney, quantity: optionalNumber,
  occurred_on: z.string().date(), reason_code: z.enum(Object.keys(RESGATE_REASONS)).optional().nullable(), feeling: z.enum(Object.keys(FEELINGS)).optional().nullable(), decision_note: optionalText(500)
}).superRefine((value, context) => {
  if (value.occurred_on > today()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['occurred_on'], message: 'A data não pode ser futura' });
  if (value.kind !== 'ajuste' && !(value.amount > 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['amount'], message: 'O valor deve ser positivo' });
  if (value.kind === 'resgate' && !value.reason_code) context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason_code'], message: 'Informe o motivo' });
  if (value.kind === 'resgate' && !value.feeling) context.addIssue({ code: z.ZodIssueCode.custom, path: ['feeling'], message: 'Informe como você se sente' });
});

const ruleTypes = DEFAULT_POLICY_RULES.map((item) => item.type);
const policyRuleSchema = z.object({ type: z.enum(ruleTypes), enabled: z.boolean().default(true), params: z.record(z.number()).default({}) }).superRefine((rule, context) => {
  if (rule.type === 'reserve_months_target' && (!Number.isInteger(rule.params.months) || rule.params.months < 1 || rule.params.months > 24)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['params', 'months'], message: 'Use de 1 a 24 meses' });
  if (rule.type === 'max_variable_income_pct' && (rule.params.pct < 0 || rule.params.pct > 100)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['params', 'pct'], message: 'Use de 0 a 100%' });
  if (rule.type === 'max_per_institution_fgc' && (rule.params.amount < 1000 || rule.params.amount > 10000000)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['params', 'amount'], message: 'Valor fora da faixa' });
});
export const policyInputSchema = z.object({ rules: z.array(policyRuleSchema).min(1), mentor_note: optionalText(2000) });
