'use client';

const BLOCOS_CONFIG = [
  { key: 'receitas', icon: '💵', label: 'Receitas' },
  { key: 'pagar-primeiro', icon: '🏦', label: 'Se Pagar 1º' },
  { key: 'doar', icon: '🤝', label: 'Doação' },
  { key: 'contas', icon: '📋', label: 'Contas' },
  { key: 'investimentos', icon: '📈', label: 'Invest' },
  { key: 'desfrute', icon: '✨', label: 'Desfrute' }
];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isRealized(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.realized === 'boolean') return item.realized;

  const normalized = String(item.realized || '')
    .trim()
    .toLowerCase();

  return ['true', 't', '1', 'yes', 'y', 'sim'].includes(normalized);
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;

  const raw = value.trim();
  if (!raw) return 0;

  const compact = raw.replace(/[^\d,.-]/g, '');
  if (!compact) return 0;

  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calcPrevisto(items) {
  return toArray(items).reduce((sum, item) => {
    const value = parseAmount(item?.valor_previsto ?? item?.valor ?? '0');
    return sum + value;
  }, 0);
}

function calcRealizado(items) {
  return toArray(items)
    .filter((item) => isRealized(item))
    .reduce((sum, item) => {
      const value = parseAmount(item?.valor_realizado ?? item?.valor_previsto ?? item?.valor ?? '0');
      return sum + value;
    }, 0);
}

function flattenContas(contas) {
  return toArray(contas).flatMap((group) => toArray(group?.subcats));
}

function fmtK(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1000) {
    const compact = (abs / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return `${sign}R$${compact}k`;
  }

  const integer = abs.toLocaleString('pt-BR', {
    maximumFractionDigits: 0
  });

  return `${sign}R$${integer}`;
}

function fmtBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export default function FinanceSummaryCard({ data = {}, mes, ano, isLoading = false }) {
  if (isLoading) {
    return (
      <section style={styles.card} aria-label="Resumo financeiro do mês">
        <div style={styles.skeleton} />
      </section>
    );
  }

  const totals = BLOCOS_CONFIG.map((block) => {
    const items = block.key === 'contas' ? flattenContas(data.contas) : toArray(data?.[block.key]);

    const previsto = calcPrevisto(items);
    const realizado = calcRealizado(items);

    return {
      ...block,
      previsto,
      realizado
    };
  });

  const receitasTotal = totals[0]?.realizado || 0;
  const gastosTotal = totals.slice(1).reduce((sum, block) => sum + block.realizado, 0);
  const saldo = receitasTotal - gastosTotal;

  const receitasPrev = totals[0]?.previsto || 0;
  const gastosPrev = totals.slice(1).reduce((sum, block) => sum + block.previsto, 0);
  const saldoPrev = receitasPrev - gastosPrev;

  const periodLabel = mes && ano ? `${mes}/${ano}` : null;

  return (
    <section style={styles.card} aria-label="Resumo financeiro do mês">
      <div style={styles.grid}>
        {totals.map((block) => (
          <div key={block.key} style={styles.block}>
            <span style={styles.blockIcon} aria-hidden="true">{block.icon}</span>
            <span style={styles.blockLabel}>{block.label}</span>
            <span style={styles.blockValue}>{fmtK(block.realizado)}</span>
            <span style={styles.blockSub}>{block.previsto > 0 ? `prev. ${fmtK(block.previsto)}` : '—'}</span>
          </div>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.balanceSection}>
        <div style={styles.balanceLabel}>Saldo Realizado do Mês</div>
        <div style={{ ...styles.balanceValue, color: saldo >= 0 ? 'var(--green-text)' : 'var(--red)' }}>{fmtBRL(saldo)}</div>

        {saldoPrev !== 0 ? (
          <div style={styles.balancePrev}>
            Previsto:{' '}
            <span style={{ color: saldoPrev >= 0 ? 'var(--green-text)' : 'var(--red)' }}>{fmtBRL(saldoPrev)}</span>
          </div>
        ) : null}

        {periodLabel ? <div style={styles.period}>{periodLabel}</div> : null}
      </div>
    </section>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--padding-card)',
    boxShadow: 'var(--shadow-card)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
    marginBottom: 20
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 3,
    minWidth: 0,
    background: 'var(--bg)',
    borderRadius: 'var(--radius-md)',
    padding: 10
  },
  blockIcon: {
    fontSize: 28,
    background: 'var(--green-dim)',
    borderRadius: 'var(--radius-full)',
    width: 40,
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    lineHeight: 1
  },
  blockLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  blockValue: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--green-dark)',
    fontFamily: "'Space Mono', monospace"
  },
  blockSub: {
    fontSize: 9,
    color: 'var(--text3)'
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    marginBottom: 16
  },
  balanceSection: {
    textAlign: 'center',
    background: 'var(--green-dim)',
    border: '1px solid var(--border-green)',
    borderRadius: 'var(--radius-lg)',
    padding: 16
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--green-text)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 6
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 900,
    letterSpacing: '-1px',
    fontFamily: "'Space Mono', monospace",
    lineHeight: 1.1
  },
  balancePrev: {
    fontSize: 11,
    color: 'var(--text2)',
    marginTop: 4
  },
  period: {
    marginTop: 8,
    fontSize: 11,
    color: 'var(--text3)',
    letterSpacing: '0.8px'
  },
  skeleton: {
    height: 240,
    borderRadius: 12,
    background: 'linear-gradient(90deg, var(--bg-input) 25%, var(--bg-section) 50%, var(--bg-input) 75%)'
  }
};
