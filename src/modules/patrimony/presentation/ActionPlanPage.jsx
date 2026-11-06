'use client';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import PatrimonyShell from './PatrimonyShell';
import ProgressBar from './ProgressBar';
import AuthorBadge from './AuthorBadge';
import ActionFormSheet from './ActionFormSheet';
import { patrimonyMutation, usePatrimony } from './usePatrimony';
import { summarizePlan } from '../domain/patrimony.action-plan';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';

export default function ActionPlanPage({ adminViewUserId }) {
  const { data = [], loading, error, refresh } = usePatrimony('/api/patrimony/action-plan', adminViewUserId);
  const [filter, setFilter] = useState('open'); const [sheet, setSheet] = useState(undefined); const [menu, setMenu] = useState(null);
  const summary = summarizePlan(data || []);
  const visible = useMemo(() => (data || []).filter((item) => filter === 'all' || (filter === 'done' ? item.status === 'cumprido' : !['cumprido', 'nao_cumprido'].includes(item.status))), [data, filter]);
  const nextDue = (data || []).filter((item) => item.due_date && !['cumprido', 'nao_cumprido'].includes(item.status)).sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date;
  async function update(id, status) { try { await patrimonyMutation(`/api/patrimony/action-plan/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, adminViewUserId); await refresh(); } catch (reason) { toast.error(reason.message); } }
  async function remove(id) { try { await patrimonyMutation(`/api/patrimony/action-plan/${id}${adminViewUserId ? `?user_id=${encodeURIComponent(adminViewUserId)}` : ''}`, { method: 'DELETE' }, null); await refresh(); } catch (reason) { toast.error(reason.message); } }
  if (loading) return <PatrimonyShell title="Meu plano de ação" adminViewUserId={adminViewUserId}><div className={base.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Meu plano de ação" adminViewUserId={adminViewUserId}><p className={base.error}>{error}</p></PatrimonyShell>;
  return <PatrimonyShell title="Meu plano de ação" subtitle={`Até o próximo marco${nextDue ? ` · próximo prazo ${new Date(`${nextDue}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}`} adminViewUserId={adminViewUserId}>
    <section className={base.card}><h2>{summary.done} de {summary.total} concluídas</h2><ProgressBar value={summary.pct} label={`${summary.pct}% do plano`} /></section>
    <div className={base.toolbar}>{[['open', 'Abertas', summary.open], ['done', 'Concluídas', summary.done], ['all', 'Todas', summary.total]].map(([key, label, count]) => <button key={key} className={`${base.filter} ${filter === key ? base.active : ''}`} onClick={() => setFilter(key)}>{label} · {count}</button>)}</div>
    <div className={base.list}>{visible.map((item) => <article key={item.id} className={`${base.item} ${item.status === 'cumprido' ? styles.completedAction : ''}`}>
      <div className={styles.actionRow}><input type="checkbox" checked={item.status === 'cumprido'} onChange={(event) => update(item.id, event.target.checked ? 'cumprido' : 'aberto')} aria-label={`Concluir: ${item.description}`} /><div><b>{item.description}</b><p className={base.muted}>{item.origin === 'resgate_adiado' ? 'criada ao adiar o resgate' : item.due_date ? `até ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Sem prazo'}</p><AuthorBadge item={item} /></div><button className={styles.menuButton} onClick={() => setMenu(menu === item.id ? null : item.id)} aria-label={`Opções de ${item.description}`}>⋯</button></div>
      {item.progress ? <ProgressBar value={item.progress.pct} label={item.progress.label} /> : null}
      {menu === item.id ? <div className={styles.actionMenu}><button className={`${base.button} ${base.secondary}`} onClick={() => setSheet(item)}>Editar</button><button className={`${base.button} ${base.secondary}`} onClick={() => update(item.id, 'em_andamento')}>Em andamento</button><button className={`${base.button} ${base.secondary}`} onClick={() => update(item.id, 'nao_cumprido')}>Não fiz</button>{adminViewUserId || item.created_by_role !== 'mentor' ? <button className={`${base.button} ${base.danger}`} onClick={() => remove(item.id)}>Excluir</button> : null}</div> : null}
    </article>)}</div>
    {!visible.length ? <section className={`${base.card} ${base.empty}`}><p>Nenhuma ação neste filtro.</p></section> : null}
    <button className={`${base.card} ${styles.newActionCard}`} onClick={() => setSheet(null)}>+ Nova ação</button>
    {sheet !== undefined ? <ActionFormSheet action={sheet} userId={adminViewUserId} onClose={() => setSheet(undefined)} onSaved={refresh} /> : null}
  </PatrimonyShell>;
}
