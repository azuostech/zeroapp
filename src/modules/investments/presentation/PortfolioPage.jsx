'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import InvestmentsShell, { buildInvestmentsHref } from './InvestmentsShell';
import SourceBadge from './SourceBadge';
import { useInvestments } from './useInvestments';
import { formatBRL, formatCompactBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { ASSET_CLASSES, GOAL_COLORS, GOAL_KINDS, TEXTS } from '../domain/investments.constants';
import { goalProgress } from '../domain/investments.goals';
import { positionReturn } from '../domain/investments.valuation';
import styles from './investments.module.css';

const TABS = [{ key: 'goal', label: 'Por objetivo' }, { key: 'class', label: 'Por classe' }, { key: 'institution', label: 'Por instituição' }];
const marketMethods = new Set(['b3_quote', 'tesouro_price', 'cvm_quota', 'fx_ptax']);
const indexLabel = (item) => item.indexer && item.indexer !== 'nenhum' ? item.indexer.toUpperCase() : item.quantity != null ? `${Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 8 })} cotas` : '';

function groupPositions(positions, tab, goals) {
  const map = new Map();
  for (const position of positions) {
    let key; let label; let color = 'var(--text3)'; let goal = null;
    if (tab === 'goal') { goal = goals.find((item) => item.id === position.goal_id); key = goal?.id || 'sem-objetivo'; label = goal?.name || 'Sem objetivo'; color = GOAL_COLORS[goal?.kind] || color; }
    else if (tab === 'class') { key = position.asset_class; label = ASSET_CLASSES[position.asset_class]?.label || position.asset_class; color = ASSET_CLASSES[position.asset_class]?.variableIncome ? 'var(--blue)' : 'var(--green)'; }
    else { key = position.institution || 'nao-informada'; label = position.institution || 'Instituição não informada'; }
    if (!map.has(key)) map.set(key, { key, label, color, goal, positions: [], total: 0 }); const group = map.get(key); group.positions.push(position); group.total += Number(position.current_value || 0);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function PositionItem({ position, userId, outsidePolicy, deadlineAlert }) {
  const returns = positionReturn(position); const hasMarket = marketMethods.has(position.pricing_method); const average = position.quantity > 0 ? Number(position.invested_amount || 0) / Number(position.quantity) : null;
  return <Link className={`${styles.portfolioItem} ${deadlineAlert ? styles.deadlineItem : ''}`} href={buildInvestmentsHref(`/${position.id}`, userId)}>
    <div className={styles.portfolioItemTop}><div className={styles.portfolioName}><b>{position.name}</b><span>{position.institution || 'Instituição não informada'}{indexLabel(position) ? ` · ${indexLabel(position)}` : ''} · <SourceBadge source={position.current_value_source} date={position.current_value_at} /></span>{position.quantity != null && ['acao', 'fii', 'etf', 'bdr'].includes(position.asset_class) ? <small>{Number(position.quantity).toLocaleString('pt-BR')} cotas{average != null ? ` · PM ${formatBRL(average)}` : ''}</small> : null}</div><div className={styles.portfolioValue}><b>{formatBRL(position.current_value)}</b>{hasMarket && returns.pct != null ? <small className={returns.pct >= 0 ? styles.returnUp : styles.returnDown}>{returns.pct >= 0 ? '▲' : '▼'} {Math.abs(returns.pct).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</small> : null}</div></div>
    {outsidePolicy ? <span className={`${styles.badge} ${styles.badgeRed}`}>FORA DA POLÍTICA</span> : null}
    {deadlineAlert ? <p className={styles.deadlineWarning}>{deadlineAlert.text}</p> : null}
  </Link>;
}

export default function PortfolioPage({ adminViewUserId }) {
  const positionsQuery = useInvestments('/api/investments/positions', adminViewUserId); const goalsQuery = useInvestments('/api/investments/goals', adminViewUserId); const overviewQuery = useInvestments('/api/investments/overview', adminViewUserId); const [tab, setTab] = useState('goal');
  const loading = positionsQuery.loading || goalsQuery.loading || overviewQuery.loading; const error = positionsQuery.error || goalsQuery.error || overviewQuery.error;
  const positions = positionsQuery.data || []; const goals = goalsQuery.data || []; const active = positions.filter((item) => item.status !== 'encerrada'); const closed = positions.filter((item) => item.status === 'encerrada'); const groups = useMemo(() => groupPositions(active, tab, goals), [active, tab, goals]);
  if (loading) return <InvestmentsShell title="Minha carteira" adminViewUserId={adminViewUserId}><div className={styles.skeleton} /></InvestmentsShell>;
  if (error) return <InvestmentsShell title="Minha carteira" adminViewUserId={adminViewUserId}><p className={styles.error}>{error}</p></InvestmentsShell>;
  const institutions = new Set(active.map((item) => item.institution).filter(Boolean)).size; const total = active.reduce((sum, item) => sum + Number(item.current_value || 0), 0); const outside = new Set(overviewQuery.data?.positionsOutOfPolicy || []); const deadlineAlerts = overviewQuery.data?.alerts?.all?.filter((item) => item.type === 'goal_maturity') || [];
  return <InvestmentsShell title="Minha carteira" subtitle={`${active.length} investimentos · ${institutions} instituições`} adminViewUserId={adminViewUserId}>
    <div className={styles.portfolioTotal}><span className={styles.eyebrow}>TOTAL</span><strong className={styles.money}>{formatBRL(total)}</strong></div>
    <div className={styles.tabs} role="tablist" aria-label="Agrupar carteira">{TABS.map((item) => <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? styles.tabActive : ''} onClick={() => setTab(item.key)}>{item.label}</button>)}</div>
    {!active.length ? <section className={`${styles.card} ${styles.empty}`}><h2>Sua carteira começa com uma decisão.</h2><p>Adicione seu primeiro investimento e dê um emprego claro para esse dinheiro.</p></section> : groups.map((group) => { const progress = group.goal?.kind === 'objetivo_prazo' ? goalProgress(group.goal, group.total, new Date().toISOString().slice(0, 10)) : null; return <section className={styles.portfolioGroup} key={group.key}><header className={styles.groupHead}><div><h2><i style={{ background: group.color }} />{group.label}</h2>{progress ? <p>Meta {formatBRL(group.goal.target_amount)} · {progress.pct}% · faltam {progress.monthsLeft} meses</p> : null}</div><strong className={styles.money}>{formatCompactBRL(group.total)}</strong></header><div className={styles.positionList}>{group.positions.map((position) => <PositionItem key={position.id} position={position} userId={adminViewUserId} outsidePolicy={outside.has(position.id)} deadlineAlert={deadlineAlerts.find((alert) => alert.href.endsWith(`/${position.id}`))} />)}</div></section>; })}
    <section className={styles.card}><h2 className={styles.cardTitle}>De onde vêm os valores</h2><div className={styles.sourceLegend}><span><i className={styles.legendMarket} />B3, Tesouro e CVM</span><span><i className={styles.legendEstimated} />Estimado pela taxa</span><span><i className={styles.legendManual} />Informado por você</span></div><p className={styles.muted}>{TEXTS.estimated}</p></section>
    <Link className={styles.button} href={buildInvestmentsHref('/carteira?new=1', adminViewUserId)}>Adicionar investimento</Link>
    {closed.length ? <details className={styles.closed}><summary>Encerrados ({closed.length})</summary><div className={styles.positionList}>{closed.map((position) => <PositionItem key={position.id} position={position} userId={adminViewUserId} />)}</div></details> : null}
  </InvestmentsShell>;
}
