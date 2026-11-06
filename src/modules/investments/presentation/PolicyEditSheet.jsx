'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DEFAULT_POLICY_RULES, POLICY_RULE_LABELS } from '../domain/investments.constants';
import { investmentsMutation } from './useInvestments';
import styles from './investments.module.css';

const copyRules = (rules = []) => DEFAULT_POLICY_RULES.map((fallback) => {
  const current = rules.find((rule) => rule.type === fallback.type);
  return { ...fallback, ...current, params: { ...fallback.params, ...current?.params } };
});

function Stepper({ value, min, max, step = 1, suffix = '', onChange }) {
  const update = (next) => onChange(Math.min(max, Math.max(min, next)));
  return <div className={styles.stepper}>
    <button type="button" onClick={() => update(value - step)} disabled={value <= min} aria-label="Diminuir">−</button>
    <output><b>{value}</b>{suffix}</output>
    <button type="button" onClick={() => update(value + step)} disabled={value >= max} aria-label="Aumentar">+</button>
  </div>;
}

export default function PolicyEditSheet({ policy, isAdmin = false, userId, onClose, onSaved }) {
  const [rules, setRules] = useState(() => copyRules(policy?.rules));
  const [mentorNote, setMentorNote] = useState(policy?.mentor_note || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { const close = (event) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  function changeRule(type, change) { setRules((current) => current.map((rule) => rule.type === type ? { ...rule, ...change } : rule)); }
  function changeParam(type, key, value) { setRules((current) => current.map((rule) => rule.type === type ? { ...rule, params: { ...rule.params, [key]: value } } : rule)); }
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      await investmentsMutation('/api/investments/policy', { method: 'POST', body: JSON.stringify({ rules, ...(isAdmin ? { mentor_note: mentorNote } : {}) }) }, userId);
      toast.success('Nova versão salva'); await onSaved?.(); onClose();
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  return <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="policy-edit-title">
      <div className={styles.sheetHandle} /><div className={styles.sheetHead}><h2 id="policy-edit-title">Editar regras</h2><button type="button" onClick={onClose} aria-label="Fechar">×</button></div>
      <form className={styles.form} onSubmit={save}>
        <div className={styles.policyEditList}>{rules.map((rule) => <section className={styles.policyEditRule} key={rule.type}>
          <div className={styles.policyEditTop}><b>{POLICY_RULE_LABELS[rule.type]?.(rule.params) || rule.type}</b><label className={styles.policySwitch}><input type="checkbox" checked={rule.enabled !== false} onChange={(event) => changeRule(rule.type, { enabled: event.target.checked })} /><span>Ativa</span></label></div>
          {rule.type === 'reserve_months_target' ? <><small>Meses de custo de vida</small><Stepper value={Number(rule.params.months)} min={1} max={24} suffix=" meses" onChange={(value) => changeParam(rule.type, 'months', value)} /></> : null}
          {rule.type === 'max_variable_income_pct' ? <><small>Limite em renda variável</small><Stepper value={Number(rule.params.pct)} min={0} max={100} step={5} suffix="%" onChange={(value) => changeParam(rule.type, 'pct', value)} /></> : null}
          {rule.type === 'max_per_institution_fgc' ? <label className={styles.moneyField}>Limite por banco<span><i>R$</i><input type="number" min="1000" max="10000000" step="1000" required value={rule.params.amount} onChange={(event) => changeParam(rule.type, 'amount', Number(event.target.value))} /></span></label> : null}
        </section>)}</div>
        {isAdmin ? <label>Palavra do mentor<textarea maxLength="2000" value={mentorNote} onChange={(event) => setMentorNote(event.target.value)} placeholder="Uma orientação breve para o aluno" /></label> : null}
        <button className={styles.button} disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova versão'}</button>
      </form>
    </section>
  </div>;
}
