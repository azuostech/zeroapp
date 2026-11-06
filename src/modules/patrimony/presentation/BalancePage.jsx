'use client';

import { useState } from 'react';
import PatrimonyShell from './PatrimonyShell';
import SettingsSheet from './SettingsSheet';
import BalanceChart from './BalanceChart';
import { usePatrimony } from './usePatrimony';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import base from './patrimony.module.css';
import styles from './patrimony-enhanced.module.css';

const isVehicle = (asset) => /carro|ve[ií]culo|moto|autom[oó]vel|caminh/i.test(`${asset.name || ''} ${asset.notes || ''}`);

function SummaryCard({ title, tone, rows, total }) {
  return (
    <section className={`${base.card} ${styles.balanceSummary} ${tone === 'debt' ? styles.debtSummary : styles.assetSummary}`}>
      <span className={base.eyebrow}>{title}</span>
      {rows.map(([label, value]) => <div className={styles.balanceRow} key={label}><span>{label}</span><b className={base.money}>{formatBRL(value, { cents: false })}</b></div>)}
      <div className={`${styles.balanceRow} ${styles.balanceTotal}`}><b>TOTAL</b><b className={`${base.money} ${tone === 'debt' ? base.debt : base.positive}`}>{formatBRL(total, { cents: false })}</b></div>
    </section>
  );
}

export default function BalancePage({ adminViewUserId }) {
  const { data, loading, error, refresh } = usePatrimony('/api/patrimony/balance', adminViewUserId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (loading) return <PatrimonyShell title="Meu Balanço" adminViewUserId={adminViewUserId}><div className={base.skeleton} /></PatrimonyShell>;
  if (error) return <PatrimonyShell title="Meu Balanço" adminViewUserId={adminViewUserId}><p className={base.error}>{error}</p></PatrimonyShell>;

  const coveragePct = data.shortTermCoverage == null ? 0 : Math.min(data.shortTermCoverage, 1) * 100;
  const independencePct = Math.max(0, Math.min(100, Number(data.independencePct || 0)));
  const staleIds = new Set((data.staleGoods || []).map((asset) => asset.id));
  const linkedByAsset = new Map((data.linkedAssets || []).map((item) => [item.assetId, item]));
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <PatrimonyShell title="Meu Balanço" subtitle="O que você tem, o que deve e o que é seu de verdade." adminViewUserId={adminViewUserId}>
      <section className={`${base.card} ${base.hero}`}>
        <div className={styles.summaryLine}><span className={base.eyebrow}>PATRIMÔNIO LÍQUIDO</span><time className={base.muted}>{today}</time></div>
        <div className={`${base.money} ${base.big} ${data.netWorth < 0 ? base.debt : base.positive}`}>{formatBRL(data.netWorth)}</div>
        <BalanceChart points={data.series} />
        <p className={`${base.muted} ${styles.chartLegend}`}><span aria-hidden="true">●</span> Pontos cheios: marcos. <span aria-hidden="true">○</span> Pontos vazados: foto automática do dia 1º de cada mês.</p>
      </section>

      <div className={styles.balanceColumns}>
        <SummaryCard title="O QUE VOCÊ TEM" rows={[["Disponível em até 30 dias", data.available30d], ["Longo prazo e bens", data.longTerm]]} total={data.totalAssets} />
        <SummaryCard title="O QUE VOCÊ DEVE" tone="debt" rows={[["Vence em 12 meses", data.dueIn12m], ["Depois de 12 meses", data.dueAfter12m]]} total={data.totalDebts} />
      </div>
      <p className={`${base.muted} ${styles.installmentNote}`}>Dívidas parceladas: aproximado pelas parcelas.</p>

      <section className={base.card}>
        <span className={base.eyebrow}>FOLGA DE CURTO PRAZO</span>
        {data.shortTermCoverage == null ? <p>Nenhuma dívida vence nos próximos 12 meses.</p> : <>
          <div className={`${base.money} ${base.big}`}>{Number(data.shortTermCoverage).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={base.bar}><i style={{ width: `${coveragePct}%` }} /></div>
          <p>Para cada R$ 1 que vence nos próximos 12 meses, você tem R$ {Number(data.shortTermCoverage).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} disponível. A meta é chegar a 1,00.</p>
        </>}
      </section>

      <section className={base.card}>
        <span className={base.eyebrow}>INDEPENDÊNCIA FINANCEIRA</span>
        {data.independencePct == null ? <>
          <p>Informe seu custo de vida para medir quanto dele já é pago pela renda dos investimentos.</p>
          <button className={`${base.button} ${base.secondary}`} onClick={() => setSettingsOpen(true)}>Informar custo de vida</button>
        </> : <>
          <div className={`${base.money} ${base.big} ${styles.blueText}`}>{Number(data.independencePct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</div>
          <div className={styles.blueBar}><i style={{ width: `${independencePct}%` }} /></div>
          <p>Seus investimentos geram cerca de {formatBRL(data.passiveIncomeMonthly, { cents: false })} por mês. Seu custo de vida é {formatBRL(data.settings?.monthly_cost_of_living, { cents: false })}. 100% é quando a renda dos investimentos paga sua vida.</p>
        </>}
      </section>

      <section className={base.card}>
        <span className={base.eyebrow}>ATIVOS</span>
        <div className={base.list}>
          {data.positions?.length ? <div className={styles.balanceAsset}><div className={base.itemTop}><b>Investimentos · Sincronizado</b><b className={`${base.money} ${base.positive}`}>{formatBRL(data.positions.reduce((sum, item) => sum + Number(item.current_value || 0), 0))}</b></div><small className={base.muted}>{data.positions.length} {data.positions.length === 1 ? 'posição atualizada' : 'posições atualizadas'} pelo módulo Investimentos</small></div> : null}
          {(data.assets || []).map((asset) => {
            const linked = linkedByAsset.get(asset.id);
            return <div className={styles.balanceAsset} key={asset.id}>
              <div className={base.itemTop}><b>{asset.name}</b><b className={`${base.money} ${base.positive}`}>{formatBRL(asset.current_value)}</b></div>
              <small className={base.muted}>{asset.institution || (['reserva', 'investimento'].includes(asset.category) ? 'Ativo financeiro manual' : 'Bem cadastrado')}</small>
              {linked ? <div className={styles.linkedDebt}><span>{linked.debtName}</span><b className={`${base.money} ${base.debt}`}>−{formatBRL(linked.debtBalance)}</b><span>É seu de verdade</span><b className={base.money}>{formatBRL(linked.equity)}</b></div> : null}
              {staleIds.has(asset.id) ? <p className={styles.staleWarning}>{isVehicle(asset) ? 'Carros perdem valor todo ano. Confira a Tabela FIPE e atualize.' : 'Confira o valor de mercado e atualize.'}</p> : null}
            </div>;
          })}
          {!data.assets?.length && !data.positions?.length ? <p className={base.muted}>Nenhum ativo cadastrado ainda.</p> : null}
        </div>
      </section>
      {settingsOpen ? <SettingsSheet settings={data.settings} userId={adminViewUserId} onClose={() => setSettingsOpen(false)} onSaved={refresh} /> : null}
    </PatrimonyShell>
  );
}
