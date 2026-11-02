'use client';

import { useState } from 'react';
import Link from 'next/link';
import PatrimonyShell, { buildPatrimonyHref } from './PatrimonyShell';
import { usePatrimony } from './usePatrimony';
import DebtFormSheet from './DebtFormSheet';
import AuthorBadge from './AuthorBadge';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { formatBRL, formatCompactBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { DEBT_TYPES } from '@/src/modules/patrimony/domain/patrimony.constants';
import NetWorthChart from './NetWorthChart';
import ProgressBar from './ProgressBar';

function Delta({ value }) {
  if (value == null) return null;
  const improved = value >= 0;
  return <small className={`${styles.metricDelta} ${improved ? base.positive : base.debt}`}>{improved ? '▲' : '▼'} {formatCompactBRL(Math.abs(value))}</small>;
}

export default function PatrimonyHubPage({ adminViewUserId }) {
  const { data, loading, error, refresh } = usePatrimony('/api/patrimony/overview', adminViewUserId);
  const [editingDebt, setEditingDebt] = useState(undefined);
  if (loading) return <PatrimonyShell title="Patrimônio" adminViewUserId={adminViewUserId}><div className={base.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Patrimônio" adminViewUserId={adminViewUserId}><p className={base.error}>{error}</p></PatrimonyShell>;

  const metrics = data.metrics;
  const points = [...(data.milestones || []), { label: 'Hoje', metrics }];
  const today = new Date().toLocaleDateString('pt-BR');
  const nextDate = data.nextCommitmentDate
    ? new Date(`${data.nextCommitmentDate}T12:00:00`).toLocaleDateString('pt-BR')
    : null;

  return (
    <PatrimonyShell title="Patrimônio" subtitle="Onde você está — de verdade." adminViewUserId={adminViewUserId}>
      <section className={`${base.card} ${base.hero}`}>
        <div className={styles.summaryLine}>
          <span className={base.eyebrow}>PATRIMÔNIO LÍQUIDO</span>
          <time className={base.muted}>{today}</time>
        </div>
        <div className={`${base.money} ${base.big} ${metrics.net_worth < 0 ? base.negative : base.positive}`}>{formatBRL(metrics.net_worth)}</div>
        <p className={base.muted}>Ativos {formatBRL(metrics.total_assets)} − Dívidas {formatBRL(metrics.total_debts)}</p>

        {data.baseline ? (
          <>
            <span className={base.pill}>{data.deltasVsBaseline.net_worth >= 0 ? '▲' : '▼'} {formatBRL(Math.abs(data.deltasVsBaseline.net_worth))} desde o Estado A</span>
            <NetWorthChart points={points} showZeroLine />
            {data.netWorthZeroProgress != null ? (
              <>
                <ProgressBar value={data.netWorthZeroProgress} label={`Rumo ao Patrimônio Zero — ${data.netWorthZeroProgress}%`} />
                <p className={base.muted}>Faltam {formatBRL(data.remainingToZero)} para tudo que você tem valer mais do que tudo que você deve.</p>
              </>
            ) : null}
          </>
        ) : (
          <div className={base.empty}>
            <p>Seu ponto de partida será registrado na sua sessão de diagnóstico. Enquanto isso, comece mapeando suas dívidas.</p>
            <Link className={base.button} href={buildPatrimonyHref('/dividas', adminViewUserId)}>Mapear dívidas</Link>
          </div>
        )}
      </section>

      <div className={base.grid}>
        <div className={base.tile}><small>ATIVOS</small><span className={`${base.money} ${base.positive}`}>{formatCompactBRL(metrics.total_assets)}</span><Delta value={data.deltasVsBaseline.total_assets} /></div>
        <div className={base.tile}><small>DÍVIDAS</small><span className={`${base.money} ${base.debt}`}>{formatCompactBRL(metrics.total_debts)}</span><Delta value={data.deltasVsBaseline.total_debts == null ? null : -data.deltasVsBaseline.total_debts} /></div>
        <div className={base.tile}><small>JUROS/MÊS</small><span className={`${base.money} ${base.debt}`}>{formatCompactBRL(metrics.monthly_interest)}</span><Delta value={data.deltasVsBaseline.monthly_interest == null ? null : -data.deltasVsBaseline.monthly_interest} /></div>
      </div>

      {adminViewUserId ? (
        <section aria-labelledby="mentor-live-debts">
          <div className={styles.sectionHeader}>
            <h2 id="mentor-live-debts" className={styles.sectionTitle}>Dívidas · editando ao vivo</h2>
            <button className={`${base.button} ${base.secondary}`} onClick={() => setEditingDebt(null)}>+ Lançar</button>
          </div>
          <div className={base.list}>
            {data.debts.filter((debt) => debt.status === 'ativa').map((debt) => (
              <div key={debt.id} className={base.item}>
                <div className={base.itemTop}>
                  <div>
                    <b>{DEBT_TYPES[debt.debt_type]?.label || debt.debt_type}</b>
                    <AuthorBadge item={debt} />
                  </div>
                  <b className={`${base.money} ${base.debt}`}>{formatBRL(debt.current_balance)}</b>
                </div>
                <button className={`${base.button} ${base.secondary} ${styles.compactButton}`} onClick={() => setEditingDebt(debt)} aria-label={`Editar ${debt.creditor}`}>
                  Editar {debt.creditor}
                </button>
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Ativos</h2>
            <Link href={buildPatrimonyHref('/ativos', adminViewUserId)}>Ver e editar ›</Link>
          </div>
          <section className={base.card}>
            <div className={base.itemTop}>
              <b>{data.assets.length} ativo(s) · reserva {metrics.reserve_months == null ? 'não calculada' : `${String(metrics.reserve_months).replace('.', ',')} mês(es)`}</b>
              <b className={`${base.money} ${base.positive}`}>{formatBRL(metrics.total_assets)}</b>
            </div>
            <p className={base.muted}>Cada alteração fica registrada com autor, data e valor anterior. O aluno pode consultar o histórico.</p>
          </section>
        </section>
      ) : null}

      <nav className={base.navGrid} aria-label="Áreas do patrimônio">
        <Link className={`${base.tile} ${base.nav}`} href={buildPatrimonyHref('/ativos', adminViewUserId)}><b>💰 Meus Ativos</b><span>Ver e atualizar ›</span></Link>
        <Link className={`${base.tile} ${base.nav}`} href={buildPatrimonyHref('/dividas', adminViewUserId)}><b>⚠️ Gestor de Dívidas</b><span>{metrics.active_debt_count} ativas ›</span></Link>
        <Link className={`${base.tile} ${base.nav}`} href={buildPatrimonyHref('/balanco', adminViewUserId)}><b>⚖️ Meu Balanço</b><span>Ver composição ›</span></Link>
        <Link className={`${base.tile} ${base.nav}`} href={buildPatrimonyHref('/plano', adminViewUserId)}><b>✅ Plano de Ação</b><span className={base.pill}>{data.openCommitments.length} abertas</span></Link>
        <Link className={`${base.tile} ${base.nav}`} href={buildPatrimonyHref('/evolucao', adminViewUserId)}><b>📈 Minha Evolução</b><span>Ver marcos ›</span></Link>
        <Link className={`${base.tile} ${base.nav}`} href={buildPatrimonyHref('/comparar', adminViewUserId)}><b>↔️ Antes × Agora</b><span>Comparar ›</span></Link>
      </nav>

      {data.latest ? (
        <section className={base.card}>
          <p><b>Último marco: {data.latest.label}</b> · {new Date(`${data.latest.milestone_date}T12:00:00`).toLocaleDateString('pt-BR')}</p>
          <p className={base.muted}>{nextDate ? `Próximo compromisso: ${nextDate} · ` : ''}{data.openCommitments.length} compromisso(s) aberto(s)</p>
        </section>
      ) : null}
      {editingDebt !== undefined ? (
        <DebtFormSheet
          debt={editingDebt}
          existingDebts={data.debts}
          userId={adminViewUserId}
          onClose={() => setEditingDebt(undefined)}
          onSaved={refresh}
        />
      ) : null}
    </PatrimonyShell>
  );
}
