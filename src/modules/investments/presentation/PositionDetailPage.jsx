'use client';
import { useState } from 'react';
import InvestmentsShell from './InvestmentsShell';
import CurveVsMarketChart from './CurveVsMarketChart';
import SourceBadge from './SourceBadge';
import PositionFormSheet from './PositionFormSheet';
import ContributionSheet from './ContributionSheet';
import RedemptionSheet from './RedemptionSheet';
import { useInvestments } from './useInvestments';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { ASSET_CLASSES, FEELINGS, GOAL_KINDS, RESGATE_REASONS, TEXTS } from '../domain/investments.constants';
import { positionReturn } from '../domain/investments.valuation';
import styles from './investments.module.css';

const marketMethods = new Set(['b3_quote', 'tesouro_price', 'cvm_quota', 'fx_ptax']);
const curveMethods = new Set(['cdi_curve', 'selic_curve', 'pre_curve', 'ipca_curve']);
const movementNames = { aporte: 'Aporte', resgate: 'Resgate', vencimento: 'Vencimento', provento: 'Provento', ajuste: 'Ajuste' };
const dateBR = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : null;
const pct = (value) => `${Number(value) >= 0 ? '+' : ''}${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

function subtitle(position) {
  const index = ({ cdi: 'CDI', selic: 'Selic', pre: 'Prefixado', ipca: 'IPCA', igpm: 'IGP-M' })[position.indexer]; const rate = position.rate != null ? `${Number(position.rate).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}% ao ano` : null;
  return [index && rate ? `${index}${position.indexer === 'ipca' ? ' +' : ''} ${rate}` : index || rate, position.maturity_date ? `vence ${dateBR(position.maturity_date)}` : null, position.institution ? `via ${position.institution}` : null].filter(Boolean).join(' · ');
}

function movementOrigin(item) {
  if (item.source === 'b3_import') return 'importado da B3'; if (item.source === 'migracao_patrimonio') return 'migrado do Patrimônio'; if (item.created_by_role === 'mentor') return 'pelo mentor'; return 'lançado por você';
}

export default function PositionDetailPage({ id, adminViewUserId }) {
  const positionQuery = useInvestments(`/api/investments/positions/${id}`, adminViewUserId); const goalsQuery = useInvestments('/api/investments/goals', adminViewUserId); const overviewQuery = useInvestments('/api/investments/overview', adminViewUserId); const [editOpen, setEditOpen] = useState(false); const [contributionOpen, setContributionOpen] = useState(false); const [redemptionOpen, setRedemptionOpen] = useState(false); const [editingMovement, setEditingMovement] = useState(null); const loading = positionQuery.loading || goalsQuery.loading || overviewQuery.loading; const error = positionQuery.error || goalsQuery.error || overviewQuery.error;
  if (loading) return <InvestmentsShell title="Investimento" adminViewUserId={adminViewUserId}><div className={styles.skeleton} /></InvestmentsShell>;
  if (error) return <InvestmentsShell title="Investimento" adminViewUserId={adminViewUserId}><p className={styles.error}>{error}</p></InvestmentsShell>;
  const position = positionQuery.data; const goal = (goalsQuery.data || []).find((item) => item.id === position.goal_id); const returns = positionReturn(position); const hasMarket = marketMethods.has(position.pricing_method); const onlyCurve = curveMethods.has(position.pricing_method); const showCurve = hasMarket && position.curve_value != null; const curveReturn = position.curve_value != null && Number(position.invested_amount) > 0 ? (Number(position.curve_value) / Number(position.invested_amount) - 1) * 100 : null; const showMarkToMarket = showCurve && Number(position.current_value) < Number(position.curve_value) * .995; const firstNoteMovement = [...position.movements].reverse().find((item) => item.kind === 'aporte' && item.decision_note);
  const chips = <div className={styles.chips}><span>{ASSET_CLASSES[position.asset_class]?.label || position.asset_class}</span><span>{position.indexer?.toUpperCase() || ASSET_CLASSES[position.asset_class]?.group?.replace('_', ' ')}</span>{goal ? <span className={styles.goalChip}>{goal.name}</span> : null}</div>;
  return <InvestmentsShell title={position.name} subtitle={subtitle(position)} adminViewUserId={adminViewUserId} beforeTitle={chips}>
    {hasMarket && position.quantity == null ? <button className={styles.infoBanner} type="button" onClick={() => setEditOpen(true)}>Informe o saldo de hoje para ver o valor de mercado ›</button> : null}
    <section className={`${styles.card} ${styles.hero}`}>
      {onlyCurve ? <div className={styles.singleValue}><span className={styles.eyebrow}>VALOR HOJE (ESTIMADO)</span><strong className={`${styles.money} ${styles.big}`}>{formatBRL(position.current_value)}</strong><p className={styles.muted}>{TEXTS.estimated}</p></div> : <div className={styles.valueGrid}><div><span className={styles.eyebrow}>VOCÊ APLICOU</span><strong className={styles.money}>{formatBRL(position.invested_amount)}</strong></div><div className={returns.abs < 0 ? styles.valueNegative : styles.valuePositive}><span className={styles.eyebrow}>SE VENDER HOJE</span><strong className={styles.money}>{formatBRL(position.current_value)}</strong><small>{returns.pct == null ? '—' : pct(returns.pct)}</small></div>{showCurve ? <div className={styles.curveValue}><span className={styles.eyebrow}>SE LEVAR ATÉ O VENCIMENTO</span><strong className={styles.money}>{formatBRL(position.curve_value)}</strong><small>valor na curva, hoje{curveReturn == null ? '' : ` · ${pct(curveReturn)}`}</small></div> : null}</div>}
      <CurveVsMarketChart series={position.series} invested={position.invested_amount} />
      <SourceBadge source={position.current_value_source} date={position.current_value_at} />
    </section>
    {showMarkToMarket ? <section className={`${styles.card} ${styles.dark}`}><h2>Por que aparece negativo?</h2><p>{TEXTS.markToMarket}</p></section> : null}
    <section className={styles.card}><span className={styles.eyebrow}>POR QUE EU COMPREI</span>{firstNoteMovement ? <blockquote>“{firstNoteMovement.decision_note}”</blockquote> : <button className={styles.textLink} type="button" onClick={() => setEditingMovement(position.movements.at(-1) || null)}>Escrever por que você escolheu este investimento</button>}{firstNoteMovement ? <p className={styles.muted}>Seu diário de decisão · {dateBR(firstNoteMovement.occurred_on)}</p> : null}</section>
    <div className={styles.sectionHead}><h2>MOVIMENTAÇÕES</h2></div>
    <div className={styles.movementList}>{position.movements.map((movement) => { const negative = ['resgate', 'vencimento'].includes(movement.kind) || movement.kind === 'ajuste' && Number(movement.amount) < 0; return <button type="button" className={styles.movement} key={movement.id} onClick={() => setEditingMovement(movement)}><div><b>{movementNames[movement.kind]}</b><span>{dateBR(movement.occurred_on)} · {movementOrigin(movement)}</span>{movement.kind === 'resgate' ? <small>{RESGATE_REASONS[movement.reason_code] || movement.reason_code} · {FEELINGS[movement.feeling] || movement.feeling}</small> : null}</div><strong className={`${styles.money} ${negative ? styles.returnDown : styles.returnUp}`}>{negative ? '−' : '+'}{formatBRL(Math.abs(Number(movement.amount)))}</strong></button>; })}</div>
    <div className={styles.buttonRow}><button className={styles.button} type="button" onClick={() => setContributionOpen(true)}>Aportar</button><button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => setRedemptionOpen(true)}>Resgatar</button></div>
    <button className={styles.editLink} type="button" onClick={() => setEditOpen(true)}>Editar dados · trocar objetivo</button>
    {editOpen ? <PositionFormSheet position={position} goals={goalsQuery.data || []} overview={overviewQuery.data} userId={adminViewUserId} onClose={() => setEditOpen(false)} onSaved={positionQuery.refresh} /> : null}
    {contributionOpen ? <ContributionSheet positions={[position]} positionId={position.id} overview={overviewQuery.data} userId={adminViewUserId} onClose={() => setContributionOpen(false)} onSaved={async () => { await Promise.all([positionQuery.refresh(), overviewQuery.refresh()]); }} /> : null}
    {redemptionOpen ? <RedemptionSheet positions={[position]} positionId={position.id} goals={goalsQuery.data || []} userId={adminViewUserId} onClose={() => setRedemptionOpen(false)} onSaved={async () => { await Promise.all([positionQuery.refresh(), overviewQuery.refresh()]); }} /> : null}
    {editingMovement ? <ContributionSheet positions={[position]} movement={editingMovement} overview={overviewQuery.data} userId={adminViewUserId} onClose={() => setEditingMovement(null)} onSaved={async () => { await Promise.all([positionQuery.refresh(), overviewQuery.refresh()]); }} /> : null}
  </InvestmentsShell>;
}
