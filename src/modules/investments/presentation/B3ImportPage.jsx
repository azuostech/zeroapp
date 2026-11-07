'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import InvestmentsShell, { buildInvestmentsHref } from './InvestmentsShell';
import { useInvestments, withInvestmentUser } from './useInvestments';
import { B3_STEPS } from '../domain/investments.constants';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import styles from './investments.module.css';

const STATUS_CLASS = { NOVO: 'statusNew', ATUALIZAR: 'statusUpdate', IGUAL: 'statusSame', CONFIRMAR: 'statusConfirm' };

export default function B3ImportPage({ adminViewUserId }) {
  const router = useRouter(); const input = useRef(null);
  const { data: goals, loading: goalsLoading, error: goalsError } = useInvestments('/api/investments/goals', adminViewUserId);
  const [instructions, setInstructions] = useState(false); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState(''); const [items, setItems] = useState([]); const [warnings, setWarnings] = useState([]);

  async function upload(file) {
    if (!file) return; setLoading(true); setItems([]); setWarnings([]);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch(withInvestmentUser('/api/investments/import/preview', adminViewUserId), { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Não foi possível ler o arquivo');
      setFileName(payload.data.fileName || file.name); setItems(payload.data.items || []); setWarnings(payload.data.warnings || []);
    } catch (error) { toast.error(error.message); setFileName(''); }
    finally { setLoading(false); if (input.current) input.current.value = ''; }
  }

  function update(id, values) { setItems((current) => current.map((item) => item.id === id ? { ...item, ...values } : item)); }
  const blocker = useMemo(() => {
    const confirm = items.find((item) => item.status === 'CONFIRMAR' && !item.resolution); if (confirm) return `Confirme se ${confirm.ticker || confirm.name} é o mesmo investimento.`;
    const goal = items.find((item) => (item.status === 'NOVO' || item.status === 'CONFIRMAR' && item.resolution === 'other') && !item.goal_id);
    return goal ? `Escolha o objetivo de ${goal.ticker || goal.name} para continuar.` : '';
  }, [items]);
  const importCount = items.filter((item) => item.status !== 'IGUAL').length;

  async function commit() {
    if (blocker || !items.length) return; setSaving(true);
    try {
      const response = await fetch('/api/investments/import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, file_name: fileName, ...(adminViewUserId ? { user_id: adminViewUserId } : {}) }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Não foi possível importar');
      toast.success(`${payload.data.imported} posições importadas`); router.push(buildInvestmentsHref('/carteira', adminViewUserId)); router.refresh();
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }

  return <InvestmentsShell title="Importar da B3" subtitle="Sua posição completa, sem digitar." adminViewUserId={adminViewUserId}>
    <ol className={styles.importSteps}>
      <li className={styles.card}><span className={styles.stepNumber}>1</span><div><h2>Baixe sua posição</h2><button type="button" className={styles.textLink} onClick={() => setInstructions((value) => !value)}>Ver passo a passo</button>{instructions ? <ol className={styles.downloadSteps}>{B3_STEPS.map((step) => <li key={step}>{step}</li>)}</ol> : null}</div></li>
      <li className={styles.card}><span className={styles.stepNumber}>2</span><div><h2>Envie o arquivo</h2><input ref={input} className={styles.fileInput} type="file" aria-label="Arquivo de posição da B3" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => upload(event.target.files?.[0])} disabled={loading} />{loading ? <p className={styles.muted}>Lendo posições…</p> : fileName ? <div className={styles.fileResult}><b>{fileName}</b><span>{items.length} posições encontradas</span><small>Lemos o arquivo e guardamos só as posições. O arquivo é descartado.</small></div> : null}</div></li>
      <li className={styles.card}><span className={styles.stepNumber}>3</span><div><h2>CONFIRA ANTES DE IMPORTAR</h2>{goalsLoading ? <div className={styles.skeleton} /> : goalsError ? <p className={styles.error}>{goalsError}</p> : items.length ? <div className={styles.importList}>{items.map((item) => <article key={item.id} className={styles.importItem}>
        <div className={styles.itemTop}><div><b>{item.ticker || item.name}</b><p>{item.institution || 'Instituição não informada'} · {formatBRL(item.value)}</p></div><span className={`${styles.importStatus} ${styles[STATUS_CLASS[item.status]]}`}>{item.status}</span></div>
        {(item.status === 'NOVO' || item.status === 'CONFIRMAR' && item.resolution === 'other') ? <label className={!item.goal_id ? styles.goalRequired : ''}>Objetivo<select value={item.goal_id || ''} onChange={(event) => update(item.id, { goal_id: event.target.value })}><option value="">Escolha o objetivo</option>{(goals || []).map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}</select></label> : null}
        {item.status === 'CONFIRMAR' ? <div className={styles.confirmButtons}><button type="button" className={item.resolution === 'same' ? styles.confirmSelected : ''} onClick={() => update(item.id, { resolution: 'same', goal_id: undefined })}>É o mesmo</button><button type="button" className={item.resolution === 'other' ? styles.confirmSelected : ''} onClick={() => update(item.id, { resolution: 'other' })}>É outro</button></div> : null}
      </article>)}</div> : <p className={styles.muted}>Envie o arquivo para conferir as posições.</p>}</div></li>
    </ol>
    {warnings.length ? <section className={`${styles.card} ${styles.importWarning}`}><b>Algumas abas não foram reconhecidas</b><p>{warnings.map((item) => item.sheet).join(', ')}</p></section> : null}
    <section className={`${styles.card} ${styles.importNotice}`}><b>Ficaram de fora</b><p>Previdência e alguns produtos de banco não aparecem na B3. Continue lançando esses manualmente.</p></section>
    {blocker ? <p className={styles.blocker}>{blocker}</p> : null}
    <button type="button" className={styles.button} disabled={!items.length || Boolean(blocker) || saving} onClick={commit}>{saving ? 'Importando…' : `Importar ${importCount} posições`}</button>
  </InvestmentsShell>;
}
