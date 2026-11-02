'use client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { patrimonyMutation, usePatrimony } from './usePatrimony';
import base from './patrimony.module.css';

export default function ActionFormSheet({ action, userId, onClose, onSaved }) {
  const { data } = usePatrimony('/api/patrimony/debts', userId);
  const [description, setDescription] = useState(action?.description || '');
  const [dueDate, setDueDate] = useState(action?.due_date || '');
  const [linkType, setLinkType] = useState(action?.link_type || 'none');
  const [linkId, setLinkId] = useState(action?.link_id || '');
  const [automatic, setAutomatic] = useState(action?.progress_source === 'debt_balance');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await patrimonyMutation(action ? `/api/patrimony/action-plan/${action.id}` : '/api/patrimony/action-plan', { method: action ? 'PATCH' : 'POST', body: JSON.stringify({ description, due_date: dueDate || null, link_type: linkType, link_id: linkType === 'none' ? null : linkId || null, progress_source: linkType === 'debt' && automatic ? 'debt_balance' : 'manual' }) }, userId);
      toast.success(action ? 'Ação atualizada' : 'Ação adicionada ao plano'); await onSaved?.(); onClose();
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  return <div className={base.sheetBackdrop} role="presentation" onClick={onClose}><section className={base.sheet} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>{action ? 'Editar ação' : 'Nova ação'}</h2><div className={base.form}>
    <label>O que você vai fazer?<input value={description} maxLength="200" onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Ligar no banco e renegociar o cartão" /></label>
    <label>Ligada a<select value={linkType} onChange={(event) => { setLinkType(event.target.value); setLinkId(''); }}><option value="none">Nenhuma</option><option value="debt">Uma dívida</option></select></label>
    {linkType === 'debt' ? <><label>Dívida<select value={linkId} onChange={(event) => setLinkId(event.target.value)}><option value="">Escolha</option>{(data?.debts || []).filter((item) => item.status === 'ativa').map((item) => <option key={item.id} value={item.id}>{item.creditor}</option>)}</select></label><label><input type="checkbox" checked={automatic} onChange={(event) => setAutomatic(event.target.checked)} /> Acompanhar pelo saldo da dívida</label></> : null}
    <label>Prazo<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
    <div className={base.row}><button className={`${base.button} ${base.secondary}`} onClick={onClose}>Cancelar</button><button className={base.button} disabled={saving || !description.trim()} onClick={save}>{saving ? 'Salvando…' : 'Adicionar ao plano'}</button></div>
  </div></section></div>;
}
