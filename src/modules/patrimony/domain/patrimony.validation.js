import { z } from 'zod';
import { ASSET_CATEGORIES, DEBT_TYPES, LIQUIDITY_LABELS } from './patrimony.constants';
import { annualToMonthlyRate, impliedMonthlyRate } from './patrimony.calculations';
import { parseBRL, parsePercent } from './patrimony.money';

const optionalText = (max) => z.string().trim().max(max).optional().nullable().transform((value) => value || null);
const money = z.union([z.string(), z.number()]).transform(parseBRL).refine((value) => value != null, 'Valor inválido');
const optionalMoney = z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : parseBRL(value)).refine((value) => value == null || value >= 0, 'Valor inválido');
const optionalInteger = (min, max) => z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : Number(value)).refine((value) => value == null || Number.isInteger(value) && value >= min && value <= max, `Use um número entre ${min} e ${max}`);

export const debtInputSchema = z.object({
  debt_type: z.enum(Object.keys(DEBT_TYPES)), creditor: z.string().trim().min(1).max(80), current_balance: money,
  interest_rate: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value) => value === '' || value == null ? null : parsePercent(value)).refine((value) => value == null || value <= 10000, 'Taxa inválida'),
  interest_rate_period: z.enum(['am', 'aa']).default('am'), is_installment: z.boolean().default(false),
  installment_amount: optionalMoney, installments_total: optionalInteger(1, 600), installments_paid: optionalInteger(0, 600).transform((value) => value ?? 0),
  monthly_payment: optionalMoney, due_day: optionalInteger(1, 31), days_overdue: optionalInteger(0, 100000).transform((value) => value ?? 0), notes: optionalText(1000)
}).superRefine((input, context) => {
  if (input.is_installment && input.installments_total == null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['installments_total'], message: 'Informe o total de parcelas' });
  if (input.installments_total != null && input.installments_paid > input.installments_total) context.addIssue({ code: z.ZodIssueCode.custom, path: ['installments_paid'], message: 'Não pode superar o total de parcelas' });
}).transform((input) => {
  let interestRate = input.interest_rate; let interestRateInput = input.interest_rate_period;
  if (interestRate != null && input.interest_rate_period === 'aa') interestRate = annualToMonthlyRate(interestRate);
  if (interestRate == null && input.is_installment && input.installment_amount && input.installments_total) {
    interestRate = impliedMonthlyRate({ balance: input.current_balance, installment: input.installment_amount, remainingInstallments: input.installments_total - input.installments_paid });
    interestRateInput = interestRate == null ? 'desconhecida' : 'calculada';
  } else if (interestRate == null) interestRateInput = 'desconhecida';
  const { interest_rate, interest_rate_period, ...rest } = input;
  return { ...rest, interest_rate_monthly: interestRate, interest_rate_input: interestRateInput, monthly_payment: input.monthly_payment ?? (input.is_installment ? input.installment_amount : null) };
});

export const assetInputSchema = z.object({
  category: z.enum(Object.keys(ASSET_CATEGORIES)), name: z.string().trim().min(1).max(80), institution: optionalText(80),
  current_value: money, liquidity: z.enum(Object.keys(LIQUIDITY_LABELS)).optional().nullable(), linked_debt_id: z.string().uuid().optional().nullable(), notes: optionalText(1000)
});
export const settingsInputSchema = z.object({
  monthly_income: optionalMoney,
  monthly_cost_of_living: optionalMoney,
  reserve_target_months: optionalInteger(1, 24).transform((value) => value ?? 6),
  daily_bank: optionalText(80)
});
export const commitmentStatusSchema = z.enum(['aberto', 'em_andamento', 'cumprido', 'nao_cumprido']);
export const actionInputSchema = z.object({
  description: z.string().trim().min(1).max(200),
  due_date: z.string().date().optional().nullable(),
  link_type: z.enum(['debt', 'goal', 'investment', 'asset', 'none']).default('none'),
  link_id: z.string().uuid().optional().nullable(),
  progress_source: z.enum(['manual', 'debt_balance', 'goal_contributions']).default('manual'),
  target_amount: optionalMoney,
  status: commitmentStatusSchema.optional()
});
export const actionRequestSchema = actionInputSchema.extend({
  origin: z.literal('resgate_adiado').optional(),
  context: z.object({
    reason_code: z.enum(['objetivo_planejado', 'imprevisto', 'quitar_divida', 'trocar_investimento', 'medo_queda', 'outro']),
    feeling: z.enum(['tranquilo', 'ansioso', 'com_medo', 'empolgado', 'pressionado']),
    amount: money
  }).optional()
}).superRefine((input, context) => {
  if (Boolean(input.origin) !== Boolean(input.context)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['context'], message: 'Origem e contexto devem ser enviados juntos' });
  if (input.origin && (input.link_type !== 'investment' || !input.link_id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['link_id'], message: 'Informe o investimento' });
});
export const milestoneInputSchema = z.object({
  milestone_date: z.string().date(), label: z.string().trim().min(1).max(60).optional(), mentor_note: optionalText(2000),
  self_assessment: optionalInteger(1, 5), student_reflection: optionalText(2000),
  commitments: z.array(z.object({ description: z.string().trim().min(1).max(200), due_date: z.string().date().optional().nullable() })).default([]),
  resolve_commitments: z.array(z.object({ id: z.string().uuid(), status: commitmentStatusSchema })).default([])
});
