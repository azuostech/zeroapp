'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PatrimonyShell from './PatrimonyShell';
import { usePatrimony, patrimonyMutation } from './usePatrimony';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import Link from 'next/link';
import { buildPatrimonyHref } from './PatrimonyShell';

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
  const isAdmin = Boolean(adminViewUserId);
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
  const [assessment, setAssessment] = useState(null);
  const [reflection, setReflection] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    setConfirmOpen(false);
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
          self_assessment: assessment,
          student_reflection: reflection,
          commitments,
          resolve_commitments: resolveCommitments
        })
      }, adminViewUserId);
      toast.success('Marco registrado');
      router.push(isAdmin ? `/admin/users/${encodeURIComponent(adminViewUserId)}/patrimonio/evolucao` : '/financas/patrimonio/evolucao');
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
      subtitle={`${data.nextLabel} · ${new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')} · por você${isAdmin ? ' (mentor)' : ''}`}
      adminViewUserId={adminViewUserId}
    >
      <section className={base.card}>
        <label className={base.form}>Data do marco<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </section>

      <section className={base.card}>
        <h2><span className={styles.stepNumber}>1</span> Confira seus números</h2>
        <p className={base.itemTop}><span>Ativos · {data.assets.length + (data.positions?.length || 0)} itens</span><b className={`${base.money} ${base.positive}`}>{formatBRL(data.metrics.total_assets)}</b></p>
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
          <h2><span className={styles.stepNumber}>2</span> Como foi seu plano de ação?</h2>
          {data.openCommitments.length ? data.openCommitments.map((item) => (
            <label key={item.id} className={styles.commitmentResolution}>
              <span>{item.description}</span>
              <select value={resolutions[item.id] || 'aberto'} onChange={(event) => setResolutions({ ...resolutions, [item.id]: event.target.value })}>
                <option value="aberto">Escolha</option>
                <option value="cumprido">Feito</option>
                <option value="em_andamento">Em andamento</option>
                <option value="nao_cumprido">Não fiz</option>
              </select>
            </label>
          )) : <p className={base.muted}>Nenhum compromisso aberto.</p>}
        </section>
      ) : null}

      {isAdmin ? <section className={base.card}>
        <h2><span className={styles.stepNumber}>3</span> Palavra do mentor</h2>
        <textarea className={styles.fullTextarea} maxLength="2000" value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que mudou nesta sessão? O aluno vê este texto no Antes × Agora." />
      </section> : <section className={base.card}>
        <h2><span className={styles.stepNumber}>3</span> Como você se sente com seu dinheiro hoje?</h2>
        <div className={styles.assessment} role="radiogroup" aria-label="Autoavaliação financeira">
          {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-pressed={assessment === value} className={assessment === value ? base.active : ''} onClick={() => setAssessment(value)}>{value}</button>)}
        </div>
        <div className={styles.assessmentLabels}><span>Perdido</span><span>No controle</span></div>
        <label className={base.form}>Sua reflexão<textarea className={styles.fullTextarea} maxLength="2000" value={reflection} onChange={(event) => setReflection(event.target.value)} /></label>
        <small className={base.muted}>{reflection.length}/2000</small>
      </section>}

      {isAdmin ? <section className={base.card}>
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
      </section> : null}

      <section className={base.card}><h2><span className={styles.stepNumber}>4</span> Próximas ações</h2><Link href={buildPatrimonyHref('/plano', adminViewUserId)}>{data.openCommitments.length} ações até o próximo marco ›</Link></section>

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

      <button className={base.button} disabled={saving || data.staleItems.length > 0} onClick={() => setConfirmOpen(true)}>
        {saving ? 'Registrando…' : '🔒 Registrar marco'}
      </button>
      <p className={base.muted}>O marco vira uma foto oficial e não pode ser editado.</p>
      {data.positions?.length ? <p className={base.muted}>Os investimentos são atualizados automaticamente.</p> : null}
      {confirmOpen ? <div className={base.sheetBackdrop} role="presentation" onClick={() => setConfirmOpen(false)}><section className={base.sheet} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Registrar marco?</h2><p>O marco vira uma foto oficial e não pode ser editado. Ele aparece com o selo “{isAdmin ? 'mentor' : 'aluno'}”.</p><div className={base.row}><button className={`${base.button} ${base.secondary}`} onClick={() => setConfirmOpen(false)}>Voltar</button><button className={base.button} onClick={freeze}>Registrar marco</button></div></section></div> : null}
    </PatrimonyShell>
  );
}
