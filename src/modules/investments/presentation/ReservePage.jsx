'use client';
import { useState } from 'react';
import Link from 'next/link';
import InvestmentsShell, { buildInvestmentsHref } from './InvestmentsShell';
import SourceBadge from './SourceBadge';
import RedemptionSheet from './RedemptionSheet';
import { useInvestments } from './useInvestments';
import SettingsSheet from '@/src/modules/patrimony/presentation/SettingsSheet';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { ASSET_CLASSES, TEXTS } from '../domain/investments.constants';
import styles from './investments.module.css';

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function ReserveBlocks({ target = 6, filled = 0, pct = 0 }) {
  if (target > 12) return <div className={`${styles.bar} ${styles.barGreen}`} aria-label={`${pct || 0}% da Reserva de Liquidez`}><i style={{ width: `${Math.min(100, pct || 0)}%` }} /></div>;
  const gap = 5; const width = (318 - gap * (target - 1)) / target;
  return <div><svg className={styles.reserveBlocks} viewBox="0 0 318 38" role="img" aria-label={`${filled} de ${target} meses preenchidos`}>{Array.from({ length: target }, (_, index) => <rect key={index} x={index * (width + gap)} y="2" width={width} height="28" rx="5" fill={index < filled ? 'var(--green)' : 'var(--border)'} />)}</svg><div className={styles.blockLegend}><span>mês 1</span><span>mês {target}</span></div></div>;
}

function checklistCopy(key, data) {
  const positions = data.positions || [];
  if (key === 'liquidity') { const count = positions.filter((item) => Number(item.liquidity_days) > 1 || item.redeemable_from && item.redeemable_from > new Date().toISOString().slice(0, 10)).length; return { title: 'Liquidez diária.', ok: 'Você resgata no mesmo dia ou no dia seguinte.', fail: `${count} investimento${count === 1 ? '' : 's'} ${count === 1 ? 'tem' : 'têm'} prazo para resgate.` }; }
  if (key === 'risk') { const count = positions.filter((item) => ASSET_CLASSES[item.asset_class]?.variableIncome || (item.risk_flags || []).includes('credito_privado')).length; return { title: 'Baixo risco.', ok: 'Sem crédito privado nem renda variável.', fail: `${count} investimento${count === 1 ? '' : 's'} ${count === 1 ? 'tem' : 'têm'} risco maior.` }; }
  if (key === 'guarantee') { const count = positions.filter((item) => !['fgc', 'tesouro'].includes(item.guarantee)).length; return { title: 'Garantia.', ok: 'Coberto pelo FGC ou pelo Tesouro Nacional.', fail: `${count} sem garantia.` }; }
  const sameBank = positions.find((item) => normalize(item.institution) === normalize(data.settings?.daily_bank));
  return { title: 'Separada do dia a dia.', ok: 'Fica em banco diferente da sua conta corrente.', fail: sameBank ? `O ${sameBank.name} está no mesmo banco da sua conta corrente. Fica fácil gastar sem perceber.` : 'Informe o banco da sua conta do dia a dia.' };
}

export default function ReservePage({ adminViewUserId }) {
  const { data, loading, error, refresh } = useInvestments('/api/investments/reserve', adminViewUserId); const [settingsOpen, setSettingsOpen] = useState(false); const [redemptionOpen, setRedemptionOpen] = useState(false);
  if (loading) return <InvestmentsShell title="Reserva de Liquidez" subtitle="Liberdade para decidir com calma." adminViewUserId={adminViewUserId}><div className={styles.skeleton} /></InvestmentsShell>;
  if (error) return <InvestmentsShell title="Reserva de Liquidez" adminViewUserId={adminViewUserId}><p className={styles.error}>{error}</p></InvestmentsShell>;
  const targetMonths = Number(data.settings?.reserve_target_months || 6); const cost = Number(data.settings?.monthly_cost_of_living || 0);
  return <InvestmentsShell title="Reserva de Liquidez" subtitle="Liberdade para decidir com calma." adminViewUserId={adminViewUserId}>
    <section className={`${styles.card} ${styles.hero}`}>
      <span className={styles.eyebrow}>SUA RESERVA HOJE</span>
      <div className={styles.reserveValue}><strong className={`${styles.money} ${styles.big}`}>{formatBRL(data.total)}</strong><span className={styles.pill}>{data.label || `0 de ${targetMonths} meses`}</span></div>
      <ReserveBlocks target={targetMonths} filled={data.filledBlocks} pct={data.pct} />
      {cost > 0 ? <><p>Meta: <b>{formatBRL(data.target)}</b> ({targetMonths} × custo de vida de {formatBRL(cost)}, definida na sua política).</p><p className={styles.muted}>Faltam {formatBRL(data.missing)}.{data.monthsToGoalLabel ? ` Com o aporte planejado de ${formatBRL(data.plannedMonthly)}/mês, você completa em cerca de ${data.monthsToGoalLabel}.` : ''}</p></> : <button className={styles.button} type="button" onClick={() => setSettingsOpen(true)}>Informe seu custo de vida</button>}
      {!data.positions.length ? <Link className={styles.button} href={buildInvestmentsHref(`/carteira?new=1&goal=${data.goal?.id || ''}`, adminViewUserId)}>Adicionar à reserva</Link> : null}
    </section>
    <div className={styles.sectionHead}><h2>SUA RESERVA ESTÁ BEM GUARDADA?</h2></div>
    <section className={styles.card}><div className={styles.checklist}>{data.checklist.map((item) => { const copy = checklistCopy(item.key, data); const status = data.positions.length || item.key === 'separate' ? item.ok : null; return <div className={styles.checkRow} key={item.key}><span className={`${styles.checkIcon} ${status === true ? styles.checkOk : status === false ? styles.checkWarn : styles.checkNeutral}`}>{status === true ? '✓' : status === false ? '!' : '·'}</span><div><b>{copy.title}</b> <span>{status === true ? copy.ok : copy.fail}</span>{item.key === 'separate' && status == null ? <button className={styles.textLink} type="button" onClick={() => setSettingsOpen(true)}>Informe o banco da sua conta do dia a dia</button> : null}</div></div>; })}</div></section>
    <div className={styles.sectionHead}><h2>ONDE ELA ESTÁ</h2></div>
    <div className={styles.positionList}>{data.positions.map((position) => <Link key={position.id} className={styles.positionCard} href={buildInvestmentsHref(`/${position.id}`, adminViewUserId)}><div><b>{position.name}</b><p>{position.institution || 'Instituição não informada'}{position.indexer ? ` · ${position.indexer.toUpperCase()}` : ''}</p><SourceBadge source={position.current_value_source} date={position.current_value_at} /></div><strong className={styles.money}>{formatBRL(position.current_value)}</strong></Link>)}</div>
    <section className={`${styles.card} ${styles.dark}`}><h2>Por que “Reserva de Liquidez”?</h2><p>{TEXTS.whyLiquidity}</p></section>
    {data.positions.length ? <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => setRedemptionOpen(true)}>Registrar uso da reserva</button> : null}
    {settingsOpen ? <SettingsSheet settings={data.settings} userId={adminViewUserId} onClose={() => setSettingsOpen(false)} onSaved={refresh} /> : null}
    {redemptionOpen ? <RedemptionSheet positions={data.positions} goals={data.goal ? [data.goal] : []} reserveMode userId={adminViewUserId} onClose={() => setRedemptionOpen(false)} onSaved={refresh} /> : null}
  </InvestmentsShell>;
}
