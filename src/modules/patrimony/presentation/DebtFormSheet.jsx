'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { patrimonyMutation } from './usePatrimony';
import { DEBT_TYPES, EXPENSIVE_RATE_MONTHLY } from '@/src/modules/patrimony/domain/patrimony.constants';
import { annualToMonthlyRate, debtMonthlyInterest } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { formatBRL, parseBRL, parsePercent } from '@/src/modules/patrimony/domain/patrimony.money';

const initial = {
  debt_type: 'cartao', creditor: '', current_balance: '', interest_rate: '', interest_rate_period: 'am',
  is_installment: false, installment_amount: '', installments_total: '', installments_paid: '0',
  monthly_payment: '', due_day: '', days_overdue: '0', notes: ''
};

function initialFromDebt(debt) {
  if (!debt) return initial;
  return {
    ...initial,
    ...debt,
    interest_rate: debt.interest_rate_monthly ?? '',
    interest_rate_period: 'am'
  };
}

export default function DebtFormSheet({ debt, existingDebts = [], userId, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialFromDebt(debt));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const firstInput = useRef(null);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  useEffect(() => {
    firstInput.current?.focus();
    const close = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const preview = useMemo(() => {
    const balance = parseBRL(form.current_balance) || 0;
    let rate = parsePercent(form.interest_rate);
    if (rate != null && form.interest_rate_period === 'aa') rate = annualToMonthlyRate(rate);
    const monthlyInterest = debtMonthlyInterest({ current_balance: balance, interest_rate_monthly: rate, status: 'ativa' });
    const higherRates = existingDebts.filter((item) => item.status === 'ativa' && item.id !== debt?.id && Number(item.interest_rate_monthly) > Number(rate ?? -1)).length;
    return { monthlyInterest, priority: rate == null ? existingDebts.length + 1 : higherRates + 1, isExpensive: Number(rate) > EXPENSIVE_RATE_MONTHLY };
  }, [debt?.id, existingDebts, form.current_balance, form.interest_rate, form.interest_rate_period]);

  function validate() {
    const next = {};
    if (!form.creditor.trim()) next.creditor = 'Informe o credor.';
    if (parseBRL(form.current_balance) == null) next.current_balance = 'Informe um saldo válido.';
    if (form.is_installment && !Number(form.installments_total)) next.installments_total = 'Informe o total de parcelas.';
    if (Number(form.installments_paid) > Number(form.installments_total || 0)) next.installments_paid = 'As parcelas pagas não podem superar o total.';
    if (form.due_day && (Number(form.due_day) < 1 || Number(form.due_day) > 31)) next.due_day = 'Use um dia entre 1 e 31.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await patrimonyMutation(debt ? `/api/patrimony/debts/${debt.id}` : '/api/patrimony/debts', {
        method: debt ? 'PATCH' : 'POST',
        body: JSON.stringify(form)
      }, userId);
      if (result.coins?.awarded) {
        toast.success('+25 ZeroCoins — dívida mapeada');
        window.dispatchEvent(new CustomEvent('zero:coins-updated', { detail: result.coins.balance }));
      } else {
        toast.success('Dívida salva');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={base.sheetBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={base.sheet} role="dialog" aria-modal="true" aria-labelledby="debt-sheet-title">
        <h2 id="debt-sheet-title">{debt ? 'Editar dívida' : 'Nova dívida'}</h2>
        {!debt ? <p className={base.muted}>Mapear é o primeiro passo para eliminar.</p> : null}
        <form className={base.form} onSubmit={submit} noValidate>
          <fieldset>
            <legend>Tipo de dívida</legend>
            <div className={styles.chipGrid}>
              {Object.entries(DEBT_TYPES).map(([key, definition]) => (
                <button key={key} type="button" className={`${styles.chip} ${form.debt_type === key ? styles.chipActive : ''}`} onClick={() => setForm({ ...form, debt_type: key })}>{definition.label}</button>
              ))}
            </div>
          </fieldset>

          <label>Credor
            <input ref={firstInput} maxLength="80" value={form.creditor} onChange={set('creditor')} aria-invalid={Boolean(errors.creditor)} />
            {errors.creditor ? <span className={styles.fieldError}>{errors.creditor}</span> : null}
          </label>
          <label>Quanto você deve hoje?
            <input inputMode="decimal" value={form.current_balance} onChange={set('current_balance')} aria-invalid={Boolean(errors.current_balance)} />
            <small>O saldo total para quitar — não só a parcela.</small>
            {errors.current_balance ? <span className={styles.fieldError}>{errors.current_balance}</span> : null}
          </label>

          <div className={base.row}>
            <label>Taxa de juros<input inputMode="decimal" value={form.interest_rate ?? ''} onChange={set('interest_rate')} /></label>
            <label>Período<select value={form.interest_rate_period} onChange={set('interest_rate_period')}><option value="am">a.m.</option><option value="aa">a.a.</option></select></label>
          </div>
          <p className={base.muted}>Não sabe a taxa? Preencha parcela e nº de parcelas — o app calcula para você.</p>

          <label className={styles.switchRow}><span>É parcelada?</span><input type="checkbox" checked={form.is_installment} onChange={set('is_installment')} /></label>
          {form.is_installment ? (
            <div className={base.row}>
              <label>Valor parcela<input inputMode="decimal" value={form.installment_amount ?? ''} onChange={set('installment_amount')} /></label>
              <label>Total parcelas<input inputMode="numeric" value={form.installments_total ?? ''} onChange={set('installments_total')} />{errors.installments_total ? <span className={styles.fieldError}>{errors.installments_total}</span> : null}</label>
              <label>Já pagas<input inputMode="numeric" value={form.installments_paid ?? ''} onChange={set('installments_paid')} />{errors.installments_paid ? <span className={styles.fieldError}>{errors.installments_paid}</span> : null}</label>
            </div>
          ) : null}

          <div className={base.row}>
            <label>Pagamento/mês<input inputMode="decimal" value={form.monthly_payment ?? ''} onChange={set('monthly_payment')} /></label>
            <label>Dia de vencimento<input inputMode="numeric" value={form.due_day ?? ''} onChange={set('due_day')} />{errors.due_day ? <span className={styles.fieldError}>{errors.due_day}</span> : null}</label>
          </div>
          <label className={styles.switchRow}><span>Está em atraso?</span><input type="checkbox" checked={Number(form.days_overdue) > 0} onChange={(event) => setForm({ ...form, days_overdue: event.target.checked ? '1' : '0' })} /></label>
          {Number(form.days_overdue) > 0 ? <label>Dias em atraso<input inputMode="numeric" value={form.days_overdue} onChange={set('days_overdue')} /></label> : null}
          <label>Garantia ou observações<textarea maxLength="1000" value={form.notes ?? ''} onChange={set('notes')} /></label>

          <div className={styles.preview}>
            <small>PRÉVIA</small>
            <p>Esta dívida custa <b>{formatBRL(preview.monthlyInterest)}</b> de juros por mês e entra como <b>prioridade {preview.priority}</b> na ordem de ataque.{preview.isExpensive ? ' É uma dívida cara.' : ''}</p>
          </div>
          {!debt ? <div className={base.card}><b>+25 ZeroCoins ao mapear esta dívida</b><p className={base.muted}>Coragem de olhar também conta. Quitou? +200.</p></div> : null}
          <div className={base.row}>
            <button type="button" className={`${base.button} ${base.secondary}`} onClick={onClose}>Cancelar</button>
            <button className={base.button} disabled={saving}>{saving ? 'Salvando…' : 'Salvar dívida'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
