'use client';

import { useState } from 'react';
import PatrimonyShell from './PatrimonyShell';
import { usePatrimony } from './usePatrimony';
import AssetFormSheet from './AssetFormSheet';
import SettingsSheet from './SettingsSheet';
import AuthorBadge from './AuthorBadge';
import ProgressBar from './ProgressBar';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';
import { formatBRL, formatPercent } from '@/src/modules/patrimony/domain/patrimony.money';

const LABELS = { reserva: 'Reserva de Liquidez', investimento: 'Investimentos', bem: 'Bens', outro: 'Outros' };

export default function AssetsPage({ adminViewUserId }) {
  const { data, loading, error, refresh } = usePatrimony('/api/patrimony/overview', adminViewUserId);
  const [selected, setSelected] = useState(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (loading) return <PatrimonyShell title="Meus Ativos" adminViewUserId={adminViewUserId}><div className={base.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Meus Ativos" adminViewUserId={adminViewUserId}><p className={base.error}>{error}</p></PatrimonyShell>;

  const metrics = data.metrics;
  const composition = data.assetComposition || {};
  const total = Math.max(1, metrics.total_assets);
  const reserveProgress = data.reserveTargetValue ? Math.min(100, Math.round(metrics.reserve_total / data.reserveTargetValue * 100)) : null;

  return (
    <PatrimonyShell title="Meus Ativos" subtitle="Tudo que é seu e tem valor." adminViewUserId={adminViewUserId}>
      <section className={`${base.card} ${base.hero}`}>
        <span className={base.eyebrow}>TOTAL EM ATIVOS</span>
        <div className={`${base.money} ${base.big} ${base.positive}`}>{formatBRL(metrics.total_assets)}</div>
        {data.deltasVsBaseline.total_assets != null ? <p className={base.positive}>▲ {formatBRL(Math.abs(data.deltasVsBaseline.total_assets))} desde o Estado A</p> : null}
        <div className={styles.composition} aria-label="Composição dos ativos">
          <span style={{ width: `${composition.reserve / total * 100}%` }} />
          <span style={{ width: `${composition.investments / total * 100}%` }} />
          <span style={{ width: `${composition.goods / total * 100}%` }} />
          <span style={{ width: `${composition.other / total * 100}%` }} />
        </div>
        <div className={styles.legend}>
          <span>Reserva {formatBRL(composition.reserve)}</span>
          <span>Investimentos {formatBRL(composition.investments)}</span>
          <span>Bens {formatBRL(composition.goods)}</span>
        </div>
        <p>Patrimônio que trabalha por você: <b>{formatBRL(metrics.productive_assets)}</b>. Os outros {formatBRL(metrics.goods_total)} são bens — têm valor, mas não geram renda.</p>
      </section>

      <section className={base.card}>
        <h2>Reserva de Liquidez</h2>
        {metrics.reserve_months != null ? (
          <>
            <ProgressBar value={reserveProgress || 0} label={`${String(metrics.reserve_months).replace('.', ',')} mês(es) de custo de vida · meta ${metrics.reserve_target_months} meses`} />
            <p className={base.muted}>Meta estimada: {formatBRL(data.reserveTargetValue)}</p>
          </>
        ) : (
          <>
            <p className={base.muted}>Informe seu custo de vida para acompanhar a reserva em meses.</p>
            <button className={`${base.button} ${base.secondary}`} onClick={() => setSettingsOpen(true)}>Informar custo de vida</button>
          </>
        )}
      </section>

      {Object.keys(LABELS).map((category) => {
        const list = data.assets.filter((asset) => asset.category === category);
        if (!list.length) return null;
        return (
          <section key={category}>
            <h2 className={styles.sectionTitle}>{LABELS[category]}</h2>
            <div className={base.list}>
              {list.map((asset) => (
                <button key={asset.id} className={base.item} onClick={() => setSelected(asset)} aria-label={`Editar ativo ${asset.name}`}>
                  <div className={base.itemTop}>
                    <div>
                      <b>{asset.name}</b>
                      <small className={base.muted}>{asset.institution || 'Atualize quando o valor mudar'}</small>
                    </div>
                    <span className={`${base.money} ${base.positive}`}>{formatBRL(asset.current_value)}</span>
                  </div>
                  <div className={styles.summaryLine}>
                    {asset.isNewSinceBaseline ? <span className={base.pill}>novo</span> : asset.valueDelta != null ? <span className={asset.valueDelta >= 0 ? base.positive : base.debt}>{asset.valueDelta >= 0 ? '▲' : '▼'} {formatBRL(Math.abs(asset.valueDelta))}{asset.valueDeltaPct != null ? ` · ${formatPercent(Math.abs(asset.valueDeltaPct), 0)}` : ''}</span> : <span />}
                    <AuthorBadge item={asset} />
                  </div>
                  {asset.linkedDebt ? <p className={base.muted}>Vinculado a: {asset.linkedDebt.creditor} ({formatBRL(asset.linkedDebt.current_balance)})</p> : null}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {!data.assets.length ? <div className={styles.emptyState}>Você ainda não cadastrou ativos.</div> : null}
      <button className={`${base.button} ${base.fabButton}`} onClick={() => setSelected(null)}>+ Novo ativo</button>
      {selected !== undefined ? <AssetFormSheet asset={selected} debts={data.debts} userId={adminViewUserId} onClose={() => setSelected(undefined)} onSaved={refresh} /> : null}
      {settingsOpen ? <SettingsSheet settings={data.settings} suggestion={data.settingsSuggestion} userId={adminViewUserId} onClose={() => setSettingsOpen(false)} onSaved={refresh} /> : null}
    </PatrimonyShell>
  );
}
