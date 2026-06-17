'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import { clampPercent, formatMoney, formatPercent, identityIcon, identityLabel } from '@/src/lib/shamar/formatters';

const CATEGORY_LABELS = {
  pequeno: 'Pequeno',
  medio: 'Medio',
  grande: 'Grande',
  epico: 'Epico'
};

export function ShamarShell({ children, activeTab = 'shamar', blue = false }) {
  const [isIAOpen, setIsIAOpen] = useState(false);

  return (
    <div className={`shamar-screen${blue ? ' shamar-screen-blue' : ''}`}>
      <main className="shamar-main">{children}</main>
      <FAB onClick={() => setIsIAOpen(true)} />
      <ShamarBottomNav activeTab={activeTab} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />
      <ShamarStyles />
    </div>
  );
}

export function ShamarHeader({
  label,
  title,
  subtitle,
  identity,
  stats = [],
  hrefBack = null,
  right = null,
  blue = false
}) {
  return (
    <header className={`shamar-hero${blue ? ' blue' : ''}`}>
      {hrefBack ? (
        <Link href={hrefBack} className="shamar-back">
          ← voltar
        </Link>
      ) : null}
      <div className="shamar-hero-top">
        <div>
          <div className="shamar-label">{label}</div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {right ? (
          right
        ) : identity ? (
          <div className="shamar-identity">
            <div className="shamar-identity-icon">{identityIcon(identity)}</div>
            <span>Identidade</span>
            <strong>{identityLabel(identity)}</strong>
          </div>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <div className="shamar-hero-stats">
          {stats.map((stat) => (
            <div className="shamar-hero-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function ShamarBottomNav({ activeTab = 'shamar' }) {
  const pathname = usePathname() || '';
  const current = activeTab || (pathname.includes('/missoes') ? 'missoes' : pathname.includes('/tribo') ? 'tribo' : 'shamar');
  const tabs = [
    { id: 'inicio', href: '/app', icon: '🏠', label: 'Início' },
    { id: 'shamar', href: '/shamar', icon: '🛡️', label: 'SHAMAR' },
    { id: 'missoes', href: '/shamar/missoes', icon: '🎯', label: 'Missões' },
    { id: 'tribo', href: '/shamar/tribo', icon: '👥', label: 'TRIBO' }
  ];

  return (
    <nav className="shamar-bottom-nav" aria-label="Navegação SHAMAR">
      {tabs.map((tab) => {
        const active = current === tab.id;
        return (
          <Link key={tab.id} href={tab.href} className={`shamar-nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span>{tab.icon}</span>
            <strong>{tab.label}</strong>
          </Link>
        );
      })}
    </nav>
  );
}

export function ShamarLoading({ label = 'Carregando SHAMAR...' }) {
  return (
    <ShamarShell>
      <div className="shamar-state">
        <div className="shamar-state-icon">🛡️</div>
        <h1>{label}</h1>
        <p>Preparando seus dados da jornada.</p>
      </div>
    </ShamarShell>
  );
}

export function ShamarSetupError({ error }) {
  return (
    <ShamarShell>
      <div className="shamar-state">
        <div className="shamar-state-icon">🛡️</div>
        <h1>SHAMAR em preparação</h1>
        <p>{error || 'O módulo ainda precisa da configuração inicial.'}</p>
      </div>
    </ShamarShell>
  );
}

export function ShamarLockedState() {
  return (
    <ShamarShell>
      <ShamarHeader
        label="Jornada SHAMAR"
        title="🛡️ SHAMAR"
        subtitle="Guardar, proteger, cultivar e multiplicar."
        stats={[
          { label: 'Níveis', value: 'Todos' },
          { label: 'Liberação', value: 'Mentor' },
          { label: 'Status', value: 'Aguardando' }
        ]}
      />
      <section className="shamar-card shamar-locked-card">
        <div className="shamar-card-body">
          <div className="shamar-state-icon">🛡️</div>
          <h2>SHAMAR ainda não disponível</h2>
          <p>O mentor pode liberar o SHAMAR para sua jornada assim que fizer sentido para a turma.</p>
        </div>
      </section>
    </ShamarShell>
  );
}

export function ShamarCard({ title, action, children, className = '' }) {
  return (
    <section className={`shamar-card ${className}`}>
      {title || action ? (
        <div className="shamar-card-header">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className="shamar-card-body">{children}</div>
    </section>
  );
}

export function IndexCard({ indexData }) {
  const index = indexData || {};
  const rows = [
    { label: 'Constância 60%', value: Number(index.score_constancia || 0), max: 600, color: 'var(--shamar-dark)' },
    { label: 'Evolução 20%', value: Number(index.score_evolucao || 0), max: 200, color: 'var(--blue)' },
    { label: 'Patrimônio 10%', value: Number(index.score_patrimonio || 0), max: 100, color: 'var(--shamar-gold)' },
    { label: 'Participação 10%', value: Number(index.score_participacao || 0), max: 100, color: 'var(--purple)' }
  ];

  return (
    <section className="shamar-index-card">
      <div className="shamar-index-head">
        <span>Índice SHAMAR</span>
        <strong>{Number(index.index_total || 0)}</strong>
      </div>
      <div className="shamar-index-body">
        {rows.map((row) => (
          <div className="shamar-index-row" key={row.label}>
            <span>{row.label}</span>
            <div className="shamar-index-track">
              <div className="shamar-index-fill" style={{ width: `${clampPercent((row.value / row.max) * 100)}%`, background: row.color }} />
            </div>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProgressSummary({ progress, config }) {
  const meta = Number(config?.meta_total || progress?.meta_total || 0);
  const total = Number(progress?.contributions_total || progress?.sum_marked || 0);
  const pct = meta > 0 ? (total / meta) * 100 : 0;

  return (
    <section className="shamar-progress-card">
      <div className="shamar-chip-row">
        <div><strong>{formatMoney(total)}</strong><span>acumulado</span></div>
        <div><strong>{formatMoney(meta)}</strong><span>meta</span></div>
        <div><strong>{formatPercent(pct)}</strong><span>progresso</span></div>
      </div>
      <div className="shamar-progress-track">
        <div className="shamar-progress-fill" style={{ width: `${clampPercent(pct)}%` }} />
      </div>
    </section>
  );
}

export function BoardGrid({ squares, preview = false, selectable = false, selectedIds = [], onToggleSquare, onSquareClick }) {
  const selected = new Set(selectedIds);
  const shownSquares = preview ? (squares || []).slice(0, 90) : squares || [];

  return (
    <div className={`shamar-board-grid${preview ? ' preview' : ''}${selectable ? ' selectable' : ''}`}>
      {shownSquares.map((square) => {
        const marked = Boolean(square.marked);
        const isSelected = selected.has(square.id);
        const categoryClass = marked || isSelected ? ` cat-${square.category}` : '';
        const buttonDisabled = selectable ? marked : false;

        return (
          <button
            key={square.id}
            type="button"
            className={`shamar-square${categoryClass}${marked ? ' marked' : ''}${isSelected ? ' selected' : ''}`}
            onClick={() => {
              if (selectable) onToggleSquare?.(square);
              else onSquareClick?.(square);
            }}
            disabled={buttonDisabled}
            title={`${formatMoney(square.value)} · ${CATEGORY_LABELS[square.category] || square.category}`}
          >
            {preview ? '' : square.position}
          </button>
        );
      })}
    </div>
  );
}

export function CategoryLegend({ compact = false }) {
  const items = [
    { id: 'pequeno', label: 'Inicial', detail: 'Primeiros 40% · posição = valor' },
    { id: 'medio', label: 'Meio', detail: 'Próximos 40% · posição = valor' },
    { id: 'grande', label: 'Marco', detail: 'Próximos 15% · posição = valor' },
    { id: 'epico', label: 'Final', detail: 'Últimos 5% · posição = valor' }
  ];

  return (
    <div className={`shamar-legend${compact ? ' compact' : ''}`}>
      {items.map((item) => (
        <div className="shamar-legend-item" key={item.id}>
          <span className={`shamar-legend-dot cat-${item.id}`} />
          <strong>{item.label}</strong>
          {!compact ? <em>{item.detail}</em> : null}
        </div>
      ))}
    </div>
  );
}

export function ShamarStyles() {
  return (
    <style jsx global>{`
      .shamar-screen {
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
      }

      .shamar-main {
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        padding: 0 14px calc(116px + env(safe-area-inset-bottom));
      }

      .shamar-hero {
        margin: 0 -14px 14px;
        padding: 18px 20px 22px;
        background: linear-gradient(155deg, var(--shamar-dark), var(--shamar-mid) 68%, var(--shamar-light));
        color: white;
        position: relative;
        overflow: hidden;
      }

      .shamar-hero.blue {
        background: linear-gradient(155deg, #1565c0, #1976d2);
      }

      .shamar-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 18px);
        opacity: 0.35;
      }

      .shamar-hero > * {
        position: relative;
      }

      .shamar-back {
        display: inline-flex;
        align-items: center;
        color: rgba(255,255,255,0.82);
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 10px;
      }

      .shamar-hero-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
      }

      .shamar-label {
        color: rgba(255,255,255,0.66);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.7px;
        text-transform: uppercase;
      }

      .shamar-hero h1 {
        margin: 3px 0;
        color: #fff;
        font-size: 24px;
        font-weight: 900;
        line-height: 1.05;
      }

      .shamar-hero p {
        margin: 0;
        color: rgba(255,255,255,0.7);
        font-size: 12px;
        line-height: 1.4;
      }

      .shamar-identity {
        text-align: right;
        min-width: 82px;
      }

      .shamar-identity-icon {
        font-size: 26px;
        line-height: 1;
      }

      .shamar-identity span {
        display: block;
        color: rgba(255,255,255,0.55);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .shamar-identity strong {
        color: var(--shamar-gold);
        font-size: 12px;
        font-weight: 900;
      }

      .shamar-hero-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 14px;
      }

      .shamar-hero-stat {
        border-radius: 10px;
        background: rgba(255,255,255,0.13);
        padding: 10px 8px;
        text-align: center;
      }

      .shamar-hero-stat strong {
        display: block;
        font-family: var(--font-mono);
        font-size: 14px;
        color: white;
      }

      .shamar-hero-stat span {
        display: block;
        color: rgba(255,255,255,0.62);
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-top: 2px;
      }

      .shamar-card,
      .shamar-index-card,
      .shamar-progress-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        overflow: hidden;
        margin-bottom: 14px;
      }

      .shamar-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
      }

      .shamar-card-header h2,
      .shamar-card-body h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 900;
      }

      .shamar-card-body {
        padding: 14px 16px;
      }

      .shamar-index-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--shamar-dark);
        color: white;
        padding: 13px 16px;
      }

      .shamar-index-head span {
        color: rgba(255,255,255,0.72);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .shamar-index-head strong {
        color: var(--shamar-gold);
        font-family: var(--font-mono);
        font-size: 26px;
        font-weight: 900;
      }

      .shamar-index-body {
        padding: 14px 16px;
      }

      .shamar-index-row {
        display: grid;
        grid-template-columns: 112px 1fr 38px;
        align-items: center;
        gap: 10px;
        margin-bottom: 9px;
      }

      .shamar-index-row:last-child {
        margin-bottom: 0;
      }

      .shamar-index-row span {
        color: var(--text2);
        font-size: 11px;
        font-weight: 700;
      }

      .shamar-index-track,
      .shamar-progress-track {
        height: 8px;
        background: var(--green-mid);
        border-radius: var(--radius-full);
        overflow: hidden;
      }

      .shamar-index-track {
        background: #f0f0f0;
        height: 7px;
      }

      .shamar-index-fill,
      .shamar-progress-fill {
        height: 100%;
        border-radius: var(--radius-full);
        transition: width 0.35s ease;
      }

      .shamar-progress-fill {
        background: var(--shamar-dark);
      }

      .shamar-index-row strong {
        color: var(--text3);
        font-family: var(--font-mono);
        font-size: 11px;
        text-align: right;
      }

      .shamar-progress-card {
        padding: 12px 14px;
      }

      .shamar-chip-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 10px;
      }

      .shamar-chip-row div {
        text-align: center;
        border-radius: 12px;
        background: var(--shamar-dim);
        padding: 10px 8px;
      }

      .shamar-chip-row strong {
        display: block;
        color: var(--shamar-dark);
        font-family: var(--font-mono);
        font-size: 13px;
      }

      .shamar-chip-row span {
        display: block;
        color: var(--text3);
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }

      .shamar-board-grid {
        display: grid;
        grid-template-columns: repeat(20, minmax(0, 1fr));
        gap: 4px;
      }

      .shamar-board-grid.preview {
        grid-template-columns: repeat(15, minmax(0, 1fr));
      }

      .shamar-square {
        aspect-ratio: 1;
        min-height: 0;
        width: 100%;
        border: 0;
        border-radius: 3px;
        background: var(--sq-empty);
        color: rgba(255,255,255,0.86);
        font-family: var(--font-mono);
        font-size: 8px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }

      .shamar-square:hover {
        background: var(--sq-hover);
        transform: scale(1.15);
        box-shadow: 0 2px 10px rgba(0,0,0,0.24);
        z-index: 2;
      }

      .shamar-square:disabled {
        cursor: not-allowed;
      }

      .shamar-square.cat-pequeno,
      .shamar-legend-dot.cat-pequeno {
        background: var(--sq-pequeno);
      }

      .shamar-square.cat-medio,
      .shamar-legend-dot.cat-medio {
        background: var(--sq-medio);
      }

      .shamar-square.cat-grande,
      .shamar-legend-dot.cat-grande {
        background: var(--sq-grande);
      }

      .shamar-square.cat-epico,
      .shamar-legend-dot.cat-epico {
        background: var(--sq-epico);
      }

      .shamar-square.selected {
        box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--shamar-dark);
      }

      .shamar-legend {
        display: grid;
        gap: 9px;
      }

      .shamar-legend.compact {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .shamar-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text2);
        font-size: 11px;
      }

      .shamar-legend-item strong {
        color: var(--text);
      }

      .shamar-legend-item em {
        color: var(--text3);
        font-style: normal;
      }

      .shamar-legend-dot {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex: 0 0 auto;
      }

      .shamar-bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 150;
        display: flex;
        justify-content: space-around;
        gap: 6px;
        background: color-mix(in srgb, var(--bg-nav) 94%, transparent);
        border-top: 1px solid var(--border);
        box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
        padding: 8px 10px calc(24px + env(safe-area-inset-bottom));
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }

      .shamar-nav-item {
        flex: 1;
        min-width: 0;
        max-width: 120px;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: var(--text3);
        padding: 8px 4px;
        transition: var(--transition);
      }

      .shamar-nav-item.active {
        color: var(--shamar-dark);
        background: var(--shamar-dim);
      }

      .shamar-nav-item span {
        font-size: 20px;
        line-height: 1;
      }

      .shamar-nav-item strong {
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .shamar-state {
        min-height: 70vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 28px 16px;
      }

      .shamar-state-icon {
        font-size: 46px;
        line-height: 1;
        margin-bottom: 12px;
      }

      .shamar-state h1,
      .shamar-state h2 {
        margin: 0 0 8px;
        color: var(--shamar-dark);
        font-size: 22px;
        font-weight: 900;
      }

      .shamar-state p,
      .shamar-locked-card p {
        margin: 0;
        color: var(--text2);
        font-size: 13px;
        line-height: 1.6;
      }

      .shamar-locked-card {
        margin-top: 16px;
        text-align: center;
      }

      .shamar-muted-row {
        display: flex;
        justify-content: space-between;
        color: var(--text3);
        font-size: 11px;
        font-weight: 700;
        margin-top: 8px;
      }

      .shamar-money {
        font-family: var(--font-mono);
        font-weight: 900;
      }

      @media (max-width: 700px) {
        .shamar-main {
          padding-left: 10px;
          padding-right: 10px;
        }

        .shamar-hero {
          margin-left: -10px;
          margin-right: -10px;
        }

        .shamar-board-grid {
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 3px;
        }

        .shamar-board-grid.preview {
          grid-template-columns: repeat(15, minmax(0, 1fr));
        }

        .shamar-index-row {
          grid-template-columns: 100px 1fr 34px;
          gap: 8px;
        }
      }
    `}</style>
  );
}
