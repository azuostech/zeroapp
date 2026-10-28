export const SETTINGS = { monthly_income: 12000, monthly_cost_of_living: 6000, reserve_target_months: 6 };
export const ESTADO_A = {
  assets: [{ category: 'bem', name: 'Veículo', current_value: 54000 }, { category: 'investimento', name: 'Previdência privada', current_value: 7900 }],
  debts: [
    { debt_type: 'cartao', creditor: 'Nubank', current_balance: 15800, interest_rate_monthly: 14.5, monthly_payment: 1600, days_overdue: 15, status: 'ativa' },
    { debt_type: 'cheque_especial', creditor: 'Itaú', current_balance: 6400, interest_rate_monthly: 8.2, monthly_payment: 1700, days_overdue: 10, status: 'ativa' },
    { debt_type: 'emprestimo', creditor: 'Itaú', current_balance: 24780, interest_rate_monthly: 3.9, is_installment: true, installment_amount: 1180, installments_total: 36, installments_paid: 11, monthly_payment: 1180, days_overdue: 0, status: 'ativa' },
    { debt_type: 'financiamento', creditor: 'BV', current_balance: 37400, interest_rate_monthly: 1.79, is_installment: true, installment_amount: 1420, installments_total: 60, installments_paid: 29, monthly_payment: 1420, days_overdue: 0, status: 'ativa' },
    { debt_type: 'familia', creditor: 'Pessoa próxima', current_balance: 5000, interest_rate_monthly: 0, monthly_payment: 0, days_overdue: 0, status: 'ativa' }
  ]
};
export const HOJE = {
  assets: [
    { category: 'reserva', name: 'CDB liquidez diária', current_value: 4200 }, { category: 'investimento', name: 'Tesouro Selic 2029', current_value: 1500 },
    { category: 'investimento', name: 'Previdência privada', current_value: 8300 }, { category: 'bem', name: 'Veículo', current_value: 52000 }
  ],
  debts: [
    { debt_type: 'cartao', creditor: 'Nubank', current_balance: 8420, interest_rate_monthly: 14.5, monthly_payment: 1500, days_overdue: 0, status: 'ativa' },
    { debt_type: 'cheque_especial', creditor: 'Itaú', current_balance: 3150, interest_rate_monthly: 8.2, monthly_payment: 740, days_overdue: 0, status: 'ativa' },
    { debt_type: 'emprestimo', creditor: 'Itaú', current_balance: 21240, interest_rate_monthly: 3.9, is_installment: true, installment_amount: 1180, installments_total: 36, installments_paid: 14, monthly_payment: 1180, days_overdue: 0, status: 'ativa' },
    { debt_type: 'financiamento', creditor: 'BV', current_balance: 34900, interest_rate_monthly: 1.79, is_installment: true, installment_amount: 1420, installments_total: 60, installments_paid: 32, monthly_payment: 1420, days_overdue: 0, status: 'ativa' },
    { debt_type: 'familia', creditor: 'Pessoa próxima', current_balance: 5000, interest_rate_monthly: 0, monthly_payment: 0, days_overdue: 0, status: 'ativa' }
  ]
};
