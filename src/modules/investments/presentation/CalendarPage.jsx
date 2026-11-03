'use client';
import Link from 'next/link';
import InvestmentsShell, { buildInvestmentsHref } from './InvestmentsShell';
import { useInvestments } from './useInvestments';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import styles from './investments.module.css';

const ICONS = { maturity: '⌛', redeemable: '🔓', goal: '🎯' };
export default function CalendarPage({ adminViewUserId }) {
  const { data, loading, error } = useInvestments('/api/investments/calendar', adminViewUserId);
  if (loading) return <InvestmentsShell title="Calendário" subtitle="Próximas datas dos seus investimentos." adminViewUserId={adminViewUserId}><div className={styles.skeleton} /></InvestmentsShell>;
  if (error) return <InvestmentsShell title="Calendário" adminViewUserId={adminViewUserId}><p className={styles.error}>{error}</p></InvestmentsShell>;
  return <InvestmentsShell title="Calendário" subtitle="Próximas datas dos seus investimentos." adminViewUserId={adminViewUserId}>
    {!data.months.length ? <section className={`${styles.card} ${styles.empty}`}><h2>Nenhum vencimento nos próximos 12 meses.</h2><p>Quando houver vencimentos, carências ou prazos de objetivos, eles aparecem aqui.</p></section> : data.months.map((group) => <section key={group.month}><h2 className={styles.calendarMonth}>{group.label}</h2><div className={styles.eventList}>{group.events.map((event) => <Link className={styles.event} key={`${event.type}-${event.id}-${event.date}`} href={event.type === 'goal' ? buildInvestmentsHref('', adminViewUserId) : buildInvestmentsHref(`/${event.id}`, adminViewUserId)}><span className={styles.eventIcon}>{ICONS[event.type]}</span><span className={styles.eventBody}><b>{event.title}</b><time>{new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR')}</time></span>{event.value != null ? <span className={styles.eventValue}>{formatBRL(event.value)}</span> : null}</Link>)}</div></section>)}
  </InvestmentsShell>;
}
