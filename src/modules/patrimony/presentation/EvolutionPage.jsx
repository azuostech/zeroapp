'use client';
import { useState } from 'react';
import Link from 'next/link';
import PatrimonyShell, { buildPatrimonyHref } from './PatrimonyShell';
import { usePatrimony } from './usePatrimony';
import NetWorthChart from './NetWorthChart';
import AuthorBadge from './AuthorBadge';
import styles from './patrimony.module.css';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';

export default function EvolutionPage({ adminViewUserId }) {
  const { data, loading, error } = usePatrimony('/api/patrimony/milestones', adminViewUserId);
  const [metric, setMetric] = useState('net_worth');
  if (loading) return <PatrimonyShell title="Minha Evolução" adminViewUserId={adminViewUserId}><div className={styles.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Minha Evolução" adminViewUserId={adminViewUserId}><p className={styles.error}>{error}</p></PatrimonyShell>;
  const chronological = [...(data || [])].reverse();
  return <PatrimonyShell title="Minha Evolução" subtitle="Cada marco é uma foto oficial" adminViewUserId={adminViewUserId}>
    {!adminViewUserId ? <Link className={styles.button} href={buildPatrimonyHref('/marco')}>Registrar marco</Link> : null}
    {!data?.length ? <div className={`${styles.card} ${styles.empty}`}><h2>Seu ponto de partida ainda será registrado</h2><p>Comece mapeando ativos e dívidas para preparar o Estado A.</p></div> : <>
      <div className={styles.toolbar}>{[['net_worth', 'Patrimônio'], ['total_debts', 'Dívidas'], ['monthly_interest', 'Juros/mês']].map(([key, label]) => <button key={key} onClick={() => setMetric(key)} className={`${styles.filter} ${metric === key ? styles.active : ''}`}>{label}</button>)}</div>
      <section className={styles.card}><NetWorthChart points={chronological} metric={metric} /></section>
      <ol className={styles.timeline}>{data.map((item) => <li key={item.id} className={`${styles.card} ${item.sequence === 0 ? styles.dark : ''}`}>
        <div className={styles.itemTop}><b>{item.label}</b><time>{new Date(`${item.milestone_date}T12:00:00`).toLocaleDateString('pt-BR')}</time></div>
        <AuthorBadge item={item} />
        <div className={`${styles.money} ${item.metrics.net_worth < 0 ? styles.debt : styles.positive}`}>{formatBRL(item.metrics.net_worth)}</div>
        {item.deltaNetWorth != null ? <p>{item.deltaNetWorth >= 0 ? '▲' : '▼'} {formatBRL(Math.abs(item.deltaNetWorth))} vs anterior</p> : null}
        {item.self_assessment ? <p>Como me sinto: {item.self_assessment}/5</p> : null}
        {item.student_reflection ? <p style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.student_reflection}</p> : null}
        {item.mentor_note ? <p>{item.mentor_note}</p> : null}
        <small>{item.commitments.cumpridos} de {item.commitments.total} compromissos cumpridos</small>
      </li>)}</ol>
      <Link className={styles.button} href={`${buildPatrimonyHref('/comparar', adminViewUserId)}?from=baseline&to=current`}>Comparar Estado A × Hoje</Link>
    </>}
  </PatrimonyShell>;
}
