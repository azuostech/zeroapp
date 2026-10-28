export const DEBT_TYPES = {
  cartao: { label: 'Cartão de crédito' }, cheque_especial: { label: 'Cheque especial' },
  emprestimo: { label: 'Empréstimo' }, financiamento: { label: 'Financiamento' },
  consignado: { label: 'Consignado' }, familia: { label: 'Família/amigos' }, outro: { label: 'Outro' }
};

export const ASSET_CATEGORIES = {
  reserva: { label: 'Reserva de emergência', productive: true },
  investimento: { label: 'Investimentos', productive: true },
  bem: { label: 'Bens', productive: false }, outro: { label: 'Outros', productive: false }
};

export const LIQUIDITY_LABELS = { diaria: 'Liquidez diária', curto_prazo: 'Curto prazo', longo_prazo: 'Longo prazo', iliquido: 'Sem liquidez' };
export const EXPENSIVE_RATE_MONTHLY = 5;
export const HEALTHY_DEBT_INCOME_RATIO = 30;
export const STALE_DAYS = 30;
export const COINS = {
  DEBT_MAPPED_ACTION: 'debt_mapped', DEBT_MAPPED_AMOUNT: 25, DEBT_MAPPED_LIFETIME_CAP: 20,
  DEBT_CLEARED_ACTION: 'debt_cleared', DEBT_CLEARED_MIN_AGE_DAYS: 7
};
export const COMPARE_INDICATORS = [
  { key: 'net_worth', label: 'Patrimônio líquido', better: 'higher', format: 'money' },
  { key: 'total_debts', label: 'Dívida total', better: 'lower', format: 'money' },
  { key: 'monthly_interest', label: 'Juros pagos por mês', better: 'lower', format: 'money' },
  { key: 'expensive_debt_total', label: 'Dívida cara (>5% a.m.)', better: 'lower', format: 'money' },
  { key: 'debt_income_ratio', label: 'Renda comprometida', better: 'lower', format: 'percent' },
  { key: 'reserve_total', label: 'Reserva de emergência', better: 'higher', format: 'money' },
  { key: 'overdue_count', label: 'Contas em atraso', better: 'lower', format: 'int' }
];
