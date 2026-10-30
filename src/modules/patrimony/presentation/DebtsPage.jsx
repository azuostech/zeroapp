'use client';

import { useState } from 'react';
import Link from 'next/link';
import PatrimonyShell, { buildPatrimonyHref } from './PatrimonyShell';
import { usePatrimony } from './usePatrimony';
import DebtFormSheet from './DebtFormSheet';
import SettingsSheet from './SettingsSheet';
import AuthorBadge from './AuthorBadge';
import ProgressBar from './ProgressBar';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { DEBT_TYPES } from '@/src/modules/patrimony/domain/patrimony.constants';
import { formatBRL, formatPercent } from '@/src/modules/patrimony/domain/patrimony.money';

export default function DebtsPage({ adminViewUserId }) {
  const { data, loading, error, refresh } = usePatrimony('/api/patrimony/debts', adminViewUserId);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filter, setFilter] = useState('todas');
  if (loading) return <PatrimonyShell title="Gestor de Dívidas" adminViewUserId={adminViewUserId}><div className={base.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Gestor de Dívidas" adminViewUserId={adminViewUserId}><p className={base.error}>{error}</p></PatrimonyShell>;

  const totals = data.totals;
  const counts = {
    todas: data.debts.filter((debt) => debt.status === 'ativa').length,
    caras: data.debts.filter((debt) => debt.status === 'ativa' && debt.isExpensive).length,
    parceladas: data.debts.filter((debt) => debt.status === 'ativa' && debt.is_installment).length,
    quitadas: data.debts.filter((debt) => debt.status === 'quitada').length
  };
  const debts = data.debts.filter((debt) => (
    filter === 'todas' ? debt.status === 'ativa'
      : filter === 'caras' ? debt.status === 'ativa' && debt.isExpensive
        : filter === 'parceladas' ? debt.status === 'ativa' && debt.is_installment
          : debt.status === 'quitada'
  ));
  const baselineTotal = Number(data.baseline?.metrics?.total_debts || 0);
  const reductionPct = baselineTotal > 0 ? Math.max(0, (baselineTotal - totals.total_debts) / baselineTotal * 100) : null;

  return (
    <PatrimonyShell title="Gestor de Dívidas" subtitle="O tamanho real do problema. E o plano." adminViewUserId={adminViewUserId}>
      <section className={`${base.card} ${base.debtHero}`}>
        <span className={base.eyebrow}>TOTAL DEVIDO HOJE</span>
        <div className={`${base.money} ${base.big} ${base.debt}`}>{formatBRL(totals.total_debts)}</div>
        {data.baseline ? <p className={base.muted}>Era {formatBRL(baselineTotal)} no Estado A {reductionPct != null ? `· ▼ ${formatPercent(reductionPct, 1)}` : ''}</p> : null}
        <div className={styles.debtMeta}>
          <div><small>SAÍDA MENSAL</small><div className={base.money}>{formatBRL(totals.monthly_debt_outflow)}</div></div>
          <div><small>SÓ DE JUROS</small><div className={`${base.money} ${base.debt}`}>{formatBRL(totals.monthly_interest)}</div></div>
        </div>
        {totals.debt_income_ratio != null ? (
          <>
            <ProgressBar value={totals.debt_income_ratio} label={`Comprometimento da renda ${formatPercent(totals.debt_income_ratio, 0)} · limite saudável 30%`} />
            <p className={base.muted}>De cada R$ 100 que entram, R$ {Math.round(totals.debt_income_ratio)} já saem para dívidas.</p>
          </>
        ) : (
          <button className={`${base.button} ${base.secondary}`} onClick={() => setSettingsOpen(true)}>Informar renda mensal</button>
        )}
      </section>

      <section className={`${base.card} ${base.dark}`}>
        <b>Ordem de ataque: maior juros primeiro</b>
        <p>{formatBRL(totals.expensive_debt_total)} estão em dívidas caras e custam {formatBRL(totals.expensive_debt_interest)} por mês — {formatPercent(totals.expensive_interest_share, 0)} de todo o juro pago.</p>
      </section>

      <div className={base.toolbar} role="tablist" aria-label="Filtros de dívida">
        {Object.entries({ todas: 'Todas', caras: 'Caras', parceladas: 'Parceladas', quitadas: 'Quitadas' }).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={filter === key} className={`${base.filter} ${filter === key ? base.active : ''}`} onClick={() => setFilter(key)}>{label} · {counts[key]}</button>
        ))}
      </div>

      <div className={base.list}>
        {debts.map((debt) => (
          <Link key={debt.id} className={base.item} href={buildPatrimonyHref(`/dividas/${debt.id}`, adminViewUserId)}>
            <div className={base.itemTop}>
              <div>
                <b>{DEBT_TYPES[debt.debt_type]?.label || debt.debt_type}</b> {debt.isExpensive ? <span className={base.tag}>CARA</span> : null}
                <small className={base.muted}>{debt.creditor} · prioridade {debt.priority || '—'}</small>
              </div>
              <strong className={`${base.money} ${base.debt}`}>{formatBRL(debt.current_balance)}</strong>
            </div>
            <div className={styles.debtMeta}>
              <div><small>TAXA</small><div>{debt.interest_rate_monthly == null ? 'Desconhecida' : `${formatPercent(debt.interest_rate_monthly)} a.m.`}</div></div>
              <div><small>{debt.is_installment ? 'PARCELA' : 'JUROS/MÊS'}</small><div className={base.money}>{formatBRL(debt.is_installment ? debt.monthlyOutflow : debt.monthlyInterest)}</div></div>
            </div>
            {debt.progress?.pct != null ? <ProgressBar value={debt.progress.pct} label={debt.progress.label} /> : null}
            <div className={styles.summaryLine}><AuthorBadge item={debt} /><b>Ver plano ›</b></div>
            {debt.debt_type === 'familia' && !debt.due_day ? <p className={base.muted}>Sem prazo combinado. Dívida sem prazo também pesa — defina uma data na próxima sessão.</p> : null}
          </Link>
        ))}
        {!debts.length ? <div className={styles.emptyState}>{filter === 'quitadas' ? 'Nenhuma dívida quitada ainda.' : 'Nenhuma dívida neste filtro.'}</div> : null}
      </div>

      <button className={`${base.button} ${base.fabButton}`} onClick={() => setOpen(true)}>+ Nova dívida</button>
      {open ? <DebtFormSheet existingDebts={data.debts} userId={adminViewUserId} onClose={() => setOpen(false)} onSaved={refresh} /> : null}
      {settingsOpen ? <SettingsSheet settings={data.settings} suggestion={data.settingsSuggestion} userId={adminViewUserId} onClose={() => setSettingsOpen(false)} onSaved={refresh} /> : null}
    </PatrimonyShell>
  );
}
