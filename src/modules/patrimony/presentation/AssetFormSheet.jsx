'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import base from './patrimony.module.css';
import { patrimonyMutation } from './usePatrimony';
import Link from 'next/link';

const initial = { category: 'bem', name: '', institution: '', current_value: '', liquidity: 'diaria', linked_debt_id: null, notes: '' };

export default function AssetFormSheet({ asset, debts = [], userId, onClose, onSaved }) {
  const [form, setForm] = useState(asset ? { ...initial, ...asset } : initial);
  const [saving, setSaving] = useState(false);
  const firstInput = useRef(null);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value || null });

  useEffect(() => {
    firstInput.current?.focus();
    const close = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await patrimonyMutation(asset ? `/api/patrimony/assets/${asset.id}` : '/api/patrimony/assets', {
        method: asset ? 'PATCH' : 'POST',
        body: JSON.stringify(form)
      }, userId);
      toast.success('Ativo salvo');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!window.confirm('Arquivar este ativo?')) return;
    try {
      await patrimonyMutation(`/api/patrimony/assets/${asset.id}`, { method: 'DELETE' }, userId);
      toast.success('Ativo arquivado');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className={base.sheetBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={base.sheet} role="dialog" aria-modal="true" aria-labelledby="asset-sheet-title">
        <h2 id="asset-sheet-title">{asset ? 'Editar ativo' : 'Novo ativo'}</h2>
        <form className={base.form} onSubmit={submit}>
          <label>Categoria
            <select value={form.category} onChange={set('category')}>
              {asset && ['reserva', 'investimento'].includes(asset.category) ? <option value={asset.category}>{asset.category === 'reserva' ? 'Reserva' : 'Investimento'}</option> : null}<option value="bem">Bem</option><option value="outro">Outro</option>
            </select>
          </label>
          {!asset ? <p className={base.muted}>Investimentos agora ficam no módulo Investimentos. <Link href={userId ? `/admin/users/${encodeURIComponent(userId)}/investimentos` : '/financas/investimentos'}>Abrir Investimentos</Link></p> : null}
          <label>Nome<input ref={firstInput} required value={form.name} onChange={set('name')} /></label>
          <label>Instituição<input value={form.institution || ''} onChange={set('institution')} /></label>
          <label>Valor atual<input required inputMode="decimal" value={form.current_value} onChange={set('current_value')} /></label>
          <label>Liquidez
            <select value={form.liquidity || ''} onChange={set('liquidity')}>
              <option value="diaria">Diária</option><option value="curto_prazo">Curto prazo</option><option value="longo_prazo">Longo prazo</option><option value="iliquido">Sem liquidez</option>
            </select>
          </label>
          {form.category === 'bem' ? (
            <label>Dívida vinculada
              <select value={form.linked_debt_id || ''} onChange={set('linked_debt_id')}>
                <option value="">Nenhuma</option>
                {debts.filter((debt) => debt.status === 'ativa').map((debt) => <option key={debt.id} value={debt.id}>{debt.creditor}</option>)}
              </select>
            </label>
          ) : null}
          <label>Observações<textarea maxLength="1000" value={form.notes || ''} onChange={set('notes')} /></label>
          <div className={base.row}>
            {asset ? <button type="button" className={`${base.button} ${base.danger}`} onClick={archive}>Arquivar</button> : null}
            <button type="button" className={`${base.button} ${base.secondary}`} onClick={onClose}>Cancelar</button>
            <button className={base.button} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
