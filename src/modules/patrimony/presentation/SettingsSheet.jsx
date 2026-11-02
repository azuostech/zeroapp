'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { patrimonyMutation } from './usePatrimony';

export default function SettingsSheet({ settings, suggestion, userId, onClose, onSaved }) {
  const [form, setForm] = useState({
    monthly_income: settings?.monthly_income ?? suggestion?.monthly_income ?? '',
    monthly_cost_of_living: settings?.monthly_cost_of_living ?? suggestion?.monthly_cost_of_living ?? '',
    reserve_target_months: settings?.reserve_target_months || 6,
    daily_bank: settings?.daily_bank ?? ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await patrimonyMutation('/api/patrimony/settings', {
        method: 'PATCH',
        body: JSON.stringify(form)
      }, userId);
      toast.success('Parâmetros atualizados');
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
      <section className={base.sheet} role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Parâmetros do patrimônio</h2>
        <p className={base.muted}>As sugestões vêm do planejamento do mês atual e só são salvas após sua confirmação.</p>
        <form className={`${base.form} ${styles.settingsGrid}`} onSubmit={submit}>
          <label>Renda mensal
            <input inputMode="decimal" value={form.monthly_income} onChange={(event) => setForm({ ...form, monthly_income: event.target.value })} />
          </label>
          <label>Custo de vida mensal
            <input inputMode="decimal" value={form.monthly_cost_of_living} onChange={(event) => setForm({ ...form, monthly_cost_of_living: event.target.value })} />
          </label>
          <label>Meta de reserva em meses
            <input inputMode="numeric" min="1" max="24" value={form.reserve_target_months} onChange={(event) => setForm({ ...form, reserve_target_months: event.target.value })} />
          </label>
          <label>Banco da sua conta do dia a dia <span className={base.muted}>(opcional)</span>
            <input maxLength="80" placeholder="Ex.: Nubank" value={form.daily_bank} onChange={(event) => setForm({ ...form, daily_bank: event.target.value })} />
          </label>
          <div className={base.row}>
            <button type="button" className={`${base.button} ${base.secondary}`} onClick={onClose}>Cancelar</button>
            <button className={base.button} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
