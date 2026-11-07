'use client';
import { useState } from 'react';
import Link from 'next/link';
import InvestmentsShell, { buildInvestmentsHref } from './InvestmentsShell';
import { useInvestments } from './useInvestments';
import styles from './investments.module.css';
import { formatBRL, formatCompactBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { progressTone } from '@/src/modules/patrimony/domain/patrimony.calculations';
import { TEXTS } from '../domain/investments.constants';
import MigrateFromPatrimonyCard from './MigrateFromPatrimonyCard';
import MentorDecisionsCard from './MentorDecisionsCard';

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const signedBRL = (value) => `${Number(value) >= 0 ? '+' : '−'}${formatBRL(Math.abs(Number(value || 0)))}`;
const pct = (value) => value == null ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

function internalHref(href, userId) {
  if (!userId) return href;
  if (href.startsWith('/financas/investimentos')) return buildInvestmentsHref(href.slice('/financas/investimentos'.length), userId);
  if (href.startsWith('/financas/patrimonio')) return `/admin/users/${encodeURIComponent(userId)}/patrimonio${href.slice('/financas/patrimonio'.length)}`;
  return href;
}

export default function InvestmentsHubPage({ adminViewUserId }) {
  const { data, loading, error, refresh } = useInvestments('/api/investments/overview', adminViewUserId);
  const [allAlerts, setAllAlerts] = useState(false);
  if (loading) return <InvestmentsShell title="Investimentos" subtitle="Todo real investido tem um emprego." adminViewUserId={adminViewUserId} backLabel="Início"><div className={styles.skeleton} /></InvestmentsShell>;
  if (error) return <InvestmentsShell title="Investimentos" adminViewUserId={adminViewUserId} backLabel="Início"><p className={styles.error}>{error}</p></InvestmentsShell>;
  const now = new Date(); const monthName = MONTH.format(now); const next = new Date(now.getFullYear(), now.getMonth() + 1, 1); const nextMonth = MONTH.format(next);
  const updated = data.oldestValueAt ? new Date(data.oldestValueAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const alerts = allAlerts ? data.alerts.all : data.alerts.top3; const planned = Number(data.contributions.planned?.total || 0); const done = Number(data.contributions.done || 0); const contributionPct = planned > 0 ? Math.round(done / planned * 100) : 0; const tone = progressTone(contributionPct);
  const addHref = buildInvestmentsHref('/carteira?new=1', adminViewUserId);
  return <InvestmentsShell title="Investimentos" subtitle="Todo real investido tem um emprego." adminViewUserId={adminViewUserId} backLabel="Início">
    <MigrateFromPatrimonyCard userId={adminViewUserId} onMigrated={refresh} />
    {adminViewUserId ? <MentorDecisionsCard userId={adminViewUserId} /> : null}
    {!data.positionCount ? <section className={`${styles.card} ${styles.empty}`}><h2>Comece pela sua Reserva de Liquidez</h2><p>{TEXTS.whyLiquidity}</p><div className={styles.buttonRow}><Link className={styles.button} href={addHref}>Adicionar investimento</Link><Link className={`${styles.button} ${styles.secondary}`} href={buildInvestmentsHref('/importar', adminViewUserId)}>Importar da B3</Link></div></section> : null}
    <section className={`${styles.card} ${styles.hero}`}>
      <div className={styles.summaryLine}><span className={styles.eyebrow}>TOTAL INVESTIDO</span><span className={styles.muted}>atualizado {updated}</span></div>
      <div className={`${styles.money} ${styles.big}`}>{formatBRL(data.total)}</div>
      <div className={styles.monthTiles}>
        <div className={styles.metricTile}><small>RENDEU EM {monthName.toUpperCase()}</small>{data.month ? <><b>{signedBRL(data.month.abs)}</b><span className={styles.muted}>{pct(data.month.pct)} no mês</span></> : <span className={styles.muted}>disponível a partir de {nextMonth}</span>}</div>
        <div className={styles.metricTile}><small>COMPARADO AO CDI</small>{data.month ? <><b>{data.month.pctOfCdi == null ? '—' : `${Math.round(data.month.pctOfCdi)}% do CDI`}</b><span className={styles.muted}>CDI no mês: {pct(data.month.cdiPct).replace('+', '')}</span></> : <span className={styles.muted}>disponível a partir de {nextMonth}</span>}</div>
      </div>
      <span className={styles.eyebrow}>ONDE SEU DINHEIRO TRABALHA</span>
      <div className={styles.goalBar} role="img" aria-label={data.goals.map((item) => `${item.goal.name}: ${item.pct}%`).join(', ')}>{data.goals.filter((item) => item.pct > 0).map((item) => <span key={item.goal.id} style={{ width: `${item.pct}%`, background: item.color }} />)}</div>
      <div className={styles.goalList}>{data.goals.map((item) => <div className={styles.goalLegend} key={item.goal.id}><span><i style={{ background: item.color }} />{item.goal.name}</span><b>{formatCompactBRL(item.total)}</b></div>)}</div>
    </section>
    <section className={styles.card}>
      <div className={styles.summaryLine}><div><span className={styles.eyebrow}>APORTES DE {monthName.toUpperCase()}</span>{data.contributions.streak >= 2 ? <div><span className={styles.pill}>{data.contributions.streak} meses seguidos</span></div> : null}</div></div>
      {planned > 0 ? <><p>Planejado nos 6 Blocos: <b>{formatBRL(done)} de {formatBRL(planned)}</b></p><div className={`${styles.bar} ${tone === 'green' ? styles.barGreen : tone === 'gold' ? styles.barGold : styles.barOrange}`}><i style={{ width: `${Math.min(100, contributionPct)}%` }} /></div><p className={styles.muted}>Pagar-se Primeiro → Reserva de Liquidez e bloco Investimentos.</p></> : <p className={styles.muted}>Planeje seus aportes no bloco Investimentos. <Link className={styles.textLink} href="/financas">Planejar agora</Link></p>}
      <Link className={styles.button} href={data.positionCount ? buildInvestmentsHref('/carteira?aporte=1', adminViewUserId) : addHref}>Registrar aporte</Link>
    </section>
    {data.alerts.all.length ? <><div className={styles.sectionHead}><h2>{data.alerts.all.length} PONTOS DE ATENÇÃO</h2>{data.alerts.all.length > 3 ? <button type="button" onClick={() => setAllAlerts((value) => !value)}>{allAlerts ? 'Mostrar menos' : `Ver todos (${data.alerts.all.length})`}</button> : null}</div><div className={styles.alerts}>{alerts.map((item, index) => <Link key={`${item.type}-${index}`} className={`${styles.alert} ${item.severity === 'red' ? styles.alertRed : styles.alertGold}`} href={internalHref(item.href, adminViewUserId)}><span className={styles.alertIcon}>{item.severity === 'red' ? '!' : '•'}</span><span><b>{item.title}</b><p>{item.text}</p></span></Link>)}</div></> : null}
    <div className={styles.sectionHead}><h2>EXPLORE SEUS INVESTIMENTOS</h2></div>
    <nav className={styles.navGrid} aria-label="Áreas de investimentos">
      <Link className={styles.navCard} href={buildInvestmentsHref('/carteira', adminViewUserId)}><b>📊 MINHA CARTEIRA</b><span>{data.positionCount} investimentos ›</span></Link>
      <Link className={styles.navCard} href={buildInvestmentsHref('/reserva', adminViewUserId)}><b>🛟 RESERVA DE LIQUIDEZ</b><span>{data.reserve.label || 'Configurar'} ›</span></Link>
      <Link className={styles.navCard} href={buildInvestmentsHref('/politica', adminViewUserId)}><b>🧭 MINHA POLÍTICA</b>{data.positionsOutOfPolicy.length ? <span className={`${styles.badge} ${styles.badgeRed}`}>{data.positionsOutOfPolicy.length} fora</span> : <span>Ver regras ›</span>}</Link>
      <Link className={styles.navCard} href={buildInvestmentsHref('/calendario', adminViewUserId)}><b>🗓️ CALENDÁRIO</b>{data.calendarThisMonth ? <span className={styles.badge}>{data.calendarThisMonth} este mês</span> : <span>Próximas datas ›</span>}</Link>
    </nav>
    <p className={styles.disclaimer}>{TEXTS.disclaimer}</p>
  </InvestmentsShell>;
}
