'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PatrimonyShell from './PatrimonyShell';
import { usePatrimony, patrimonyMutation } from './usePatrimony';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';

function localDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function delta(current, reference) {
  if (!reference?.metrics) return null;
  return Number(current?.net_worth || 0) - Number(reference.metrics.net_worth || 0);
}

export default function MilestoneFreezePage({ adminViewUserId }) {
  const router = useRouter();
  const { data, loading, error, refresh } = usePatrimony('/api/patrimony/milestones/preview', adminViewUserId);
  const [date, setDate] = useState(localDate);
  const [note, setNote] = useState('');
  const [commitments, setCommitments] = useState([]);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [resolutions, setResolutions] = useState({});
  const [confirmingId, setConfirmingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function confirmStale(item) {
    setConfirmingId(item.id);
    try {
      await patrimonyMutation(`/api/patrimony/${item.entityType === 'asset' ? 'assets' : 'debts'}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ confirm: true })
      }, adminViewUserId);
      toast.success(`${item.name || item.creditor} confirmado`);
      await refresh();
    } catch (reason) {
      toast.error(reason.message);
    } finally {
      setConfirmingId(null);
    }
  }

  function addCommitment() {
    const value = description.trim();
    if (!value) return;
    setCommitments([...commitments, { description: value, due_date: dueDate || null }]);
    setDescription('');
  }

  function removeCommitment(index) {
    setCommitments(commitments.filter((_, itemIndex) => itemIndex !== index));
  }

  async function freeze() {
    if (data.staleItems.length) {
      toast.error('Confirme ou atualize os itens desatualizados antes de congelar o marco.');
      return;
    }
    if (!window.confirm('O marco vira a foto oficial deste momento e não pode ser editado.')) return;
    setSaving(true);
    try {
      const resolveCommitments = data.openCommitments
        .filter((item) => resolutions[item.id] && resolutions[item.id] !== 'aberto')
        .map((item) => ({ id: item.id, status: resolutions[item.id] }));
      await patrimonyMutation('/api/patrimony/milestones', {
        method: 'POST',
        body: JSON.stringify({
          milestone_date: date,
          mentor_note: note,
          commitments,
          resolve_commitments: resolveCommitments
        })
      }, adminViewUserId);
      toast.success('Marco congelado');
      router.push(`/admin/users/${encodeURIComponent(adminViewUserId)}/patrimonio/evolucao`);
    } catch (reason) {
      toast.error(reason.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PatrimonyShell title="Registrar marco" adminViewUserId={adminViewUserId}><div className={base.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Registrar marco" adminViewUserId={adminViewUserId}><p className={base.error}>{error}</p></PatrimonyShell>;

  const previousDelta = delta(data.metrics, data.previous);
  const baselineDelta = delta(data.metrics, data.baseline);

  return (
    <PatrimonyShell
      title={data.nextSequence === 0 ? 'Registrar Estado A (ponto de partida)' : `Registrar marco · ${data.nextLabel}`}
      subtitle="Revise os números com o aluno antes de congelar."
      adminViewUserId={adminViewUserId}
    >
      <section className={base.card}>
        <label className={base.form}>Data do marco<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </section>

      <section className={base.card}>
        <h2><span className={styles.stepNumber}>1</span> Revise os números com o aluno</h2>
        <p className={base.itemTop}><span>Ativos · {data.assets.length} itens</span><b className={`${base.money} ${base.positive}`}>{formatBRL(data.metrics.total_assets)}</b></p>
        <p className={base.itemTop}><span>Dívidas · {data.debts.filter((item) => item.status === 'ativa').length} itens</span><b className={`${base.money} ${base.debt}`}>{formatBRL(data.metrics.total_debts)}</b></p>
        <p className={base.itemTop}><span>Patrimônio líquido</span><b className={base.money}>{formatBRL(data.metrics.net_worth)}</b></p>

        {data.staleItems.length ? (
          <div className={styles.staleList}>
            <p className={base.muted}>Confirme os valores sem atualização há mais de 30 dias.</p>
            {data.staleItems.map((item) => (
              <div key={`${item.entityType}-${item.id}`} className={styles.staleItem}>
                <div><b>{item.name || item.creditor}</b><small className={base.muted}>sem atualização há {item.daysSinceUpdate} dias</small></div>
                <button className={`${base.button} ${base.secondary}`} disabled={confirmingId === item.id} onClick={() => confirmStale(item)}>
                  {confirmingId === item.id ? 'Confirmando…' : 'Confirmar'}
                </button>
              </div>
            ))}
          </div>
        ) : <p className={base.positive}>✓ Todos os valores estão atualizados.</p>}
      </section>

      {data.nextSequence > 0 ? (
        <section className={base.card}>
          <h2>Compromissos do marco anterior</h2>
          {data.openCommitments.length ? data.openCommitments.map((item) => (
            <label key={item.id} className={styles.commitmentResolution}>
              <span>{item.description}</span>
              <select value={resolutions[item.id] || 'aberto'} onChange={(event) => setResolutions({ ...resolutions, [item.id]: event.target.value })}>
                <option value="aberto">Manter aberto</option>
                <option value="cumprido">Cumprido</option>
                <option value="nao_cumprido">Não cumprido</option>
              </select>
            </label>
          )) : <p className={base.muted}>Nenhum compromisso aberto.</p>}
        </section>
      ) : null}

      <section className={base.card}>
        <h2><span className={styles.stepNumber}>2</span> Palavra do mentor</h2>
        <textarea className={styles.fullTextarea} maxLength="2000" value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que mudou nesta sessão? O aluno vê este texto no Antes × Agora." />
      </section>

      <section className={base.card}>
        <h2><span className={styles.stepNumber}>3</span> Compromissos até o próximo encontro</h2>
        <div className={styles.commitmentComposer}>
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Novo compromisso" maxLength="200" />
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Prazo do compromisso" />
          <button className={base.button} onClick={addCommitment}>Adicionar</button>
        </div>
        {commitments.map((item, index) => (
          <div key={`${item.description}-${index}`} className={styles.newCommitment}>
            <span>✓ {item.description}{item.due_date ? ` · ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</span>
            <button className={`${base.button} ${base.secondary}`} onClick={() => removeCommitment(index)}>Remover</button>
          </div>
        ))}
      </section>

      {data.nextSequence > 0 ? (
        <section className={`${base.card} ${base.dark}`}>
          <span className={base.eyebrow}>PRÉVIA DO MARCO</span>
          <div className={base.grid}>
            <div><small>vs. {data.previous?.label}</small><div className={`${base.money} ${previousDelta >= 0 ? base.positive : base.debt}`}>{previousDelta >= 0 ? '+' : '−'}{formatBRL(Math.abs(previousDelta || 0))}</div></div>
            <div><small>vs. Estado A</small><div className={`${base.money} ${baselineDelta >= 0 ? base.positive : base.debt}`}>{baselineDelta >= 0 ? '+' : '−'}{formatBRL(Math.abs(baselineDelta || 0))}</div></div>
          </div>
          <p>Patrimônio líquido: {formatBRL(data.previous?.metrics?.net_worth || 0)} → {formatBRL(data.metrics.net_worth)}</p>
        </section>
      ) : null}

      <button className={base.button} disabled={saving || data.staleItems.length > 0} onClick={freeze}>
        {saving ? 'Congelando…' : '🔒 Congelar marco'}
      </button>
      <p className={base.muted}>O marco vira a foto oficial deste momento e não pode ser editado. O aluno recebe uma notificação.</p>
    </PatrimonyShell>
  );
}
