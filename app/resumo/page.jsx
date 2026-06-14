'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import BlocoResumoStrip from '@/src/modules/finance/presentation/BlocoResumoStrip';
import {
  percentualRealizado,
  statusBloco,
  totalPrevisto,
  totalPrevistoContas,
  totalRealizado,
  totalRealizadoContas
} from '@/src/modules/finance/domain/finance.calculations';

const BLOCK_ORDER = [
  { key: 'receitas', nome: 'Receitas', icon: '💰', tipo: 'receita' },
  { key: 'pagar-primeiro', nome: 'Se Pagar Primeiro', icon: '🛟', tipo: 'gasto' },
  { key: 'doar', nome: 'Doação', icon: '🤝', tipo: 'gasto' },
  { key: 'contas', nome: 'Contas', icon: '📄', tipo: 'gasto' },
  { key: 'investimentos', nome: 'Investimentos', icon: '📈', tipo: 'gasto' },
  { key: 'desfrute', nome: 'Desfrute', icon: '✨', tipo: 'gasto' }
];

function pad2(num) {
  return String(num).padStart(2, '0');
}

function nowPeriod() {
  const date = new Date();
  return { month: pad2(date.getMonth() + 1), year: String(date.getFullYear()) };
}

function shiftPeriod({ month, year }, delta) {
  const date = new Date(Number(year), Number(month) - 1 + delta, 1);
  return { month: pad2(date.getMonth() + 1), year: String(date.getFullYear()) };
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function flattenContas(contas = []) {
  if (!Array.isArray(contas)) return [];
  return contas.flatMap((grupo) => (Array.isArray(grupo?.subcats) ? grupo.subcats : []));
}

function buildStatusLabel({ status, percent, pending }) {
  if (status === 'vazio') return 'Não iniciado';
  if (status === 'acima') return `⚠ Acima +${Math.max(0, percent - 100)}%`;
  if (status === 'completo') return 'Completo ✓';
  return `${pending} pendentes`;
}

export default function ResumoPage() {
  const [period, setPeriod] = useState(() => nowPeriod());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({});
  const [isIAOpen, setIsIAOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/finance/month?month=${period.month}&year=${period.year}`, {
          cache: 'no-store'
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Não foi possível carregar o resumo mensal.');
        }

        if (mounted) {
          setData(payload?.data || {});
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar resumo.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [period.month, period.year]);

  const blocos = useMemo(() => {
    return BLOCK_ORDER.map((block) => {
      const items = block.key === 'contas' ? flattenContas(data?.contas) : Array.isArray(data?.[block.key]) ? data[block.key] : [];

      const previsto = block.key === 'contas' ? totalPrevistoContas(data?.contas || []) : totalPrevisto(items);
      const realizado = block.key === 'contas' ? totalRealizadoContas(data?.contas || []) : totalRealizado(items);
      const percent = percentualRealizado(items);
      const status = statusBloco(items);
      const pending = items.filter((item) => !item?.realized).length;

      return {
        ...block,
        items,
        previsto,
        realizado,
        percent,
        status,
        pending,
        label: buildStatusLabel({ status, percent, pending })
      };
    });
  }, [data]);

  const resumo = useMemo(() => {
    const receitas = blocos.find((block) => block.key === 'receitas');
    const gastos = blocos.filter((block) => block.key !== 'receitas');

    const receitasPrev = receitas?.previsto || 0;
    const receitasReal = receitas?.realizado || 0;

    const gastosPrev = gastos.reduce((acc, block) => acc + block.previsto, 0);
    const gastosReal = gastos.reduce((acc, block) => acc + block.realizado, 0);

    const saldoPrevisto = receitasPrev - gastosPrev;
    const saldoRealizado = receitasReal - gastosReal;
    const aindaASair = Math.max(0, gastosPrev - gastosReal);

    return {
      saldoPrevisto,
      saldoRealizado,
      aindaASair,
      receitasPrev,
      receitasReal,
      gastosPrev,
      gastosReal
    };
  }, [blocos]);

  const insights = useMemo(() => {
    const items = [];

    const acimaDoPrevisto = blocos.filter(
      (block) => block.key !== 'receitas' && block.previsto > 0 && block.realizado > block.previsto
    );

    if (acimaDoPrevisto.length > 0) {
      items.push({
        tone: 'warn',
        text: `Atenção: ${acimaDoPrevisto.map((b) => b.nome).join(', ')} está acima do previsto.`
      });
    }

    const reserva = blocos.find((block) => block.key === 'pagar-primeiro');
    if (reserva && reserva.previsto > 0 && reserva.realizado >= reserva.previsto) {
      items.push({
        tone: 'good',
        text: 'Excelente: meta do bloco Se Pagar Primeiro já foi realizada neste mês.'
      });
    }

    return items;
  }, [blocos]);

  return (
    <main className="resumo-shell">
      <div className="resumo-header">
        <div>
          <h1 className="text-display">Resumo Mensal</h1>
          <p>Visão consolidada de previsto x realizado por bloco</p>
        </div>
        <Link href="/app" className="back-link">
          Voltar ao app
        </Link>
      </div>

      <div className="period-nav">
        <button type="button" onClick={() => setPeriod((prev) => shiftPeriod(prev, -1))}>
          ◀
        </button>
        <strong>{`${period.month}/${period.year}`}</strong>
        <button type="button" onClick={() => setPeriod((prev) => shiftPeriod(prev, +1))}>
          ▶
        </button>
      </div>

      {loading ? <div className="feedback">Carregando resumo...</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      {!loading && !error ? (
        <>
          <section className="saldo-card">
            <div className="text-label">Saldo principal do mês</div>
            <strong className="saldo-main">{formatMoney(resumo.saldoRealizado)}</strong>
            <div className="saldo-meta">
              <span>Previsto: {formatMoney(resumo.saldoPrevisto)}</span>
              <span>A sair: {formatMoney(resumo.aindaASair)}</span>
            </div>
          </section>

          {insights.length > 0 ? (
            <section className="insights">
              {insights.map((insight) => (
                <div key={insight.text} className={`insight ${insight.tone}`}>
                  {insight.text}
                </div>
              ))}
            </section>
          ) : null}

          <section className="blocos-grid">
            {blocos.map((block) => (
              <article key={block.key} className="bloco-card">
                <header>
                  <span className="icon">{block.icon}</span>
                  <div>
                    <h3>{block.nome}</h3>
                    <small className={`status-badge ${block.status}`}>{block.label}</small>
                  </div>
                </header>

                <BlocoResumoStrip
                  totalPrevisto={block.previsto}
                  totalRealizado={block.realizado}
                  tipo={block.tipo === 'receita' ? 'receita' : 'gasto'}
                />

                <div className="totais">
                  <span>{formatMoney(block.realizado)}</span>
                  <span>prev. {formatMoney(block.previsto)}</span>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}

      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />

      <style jsx>{`
        .resumo-shell {
          max-width: 1080px;
          margin: 0 auto;
          padding: 28px 16px 120px;
          color: var(--text);
          background: var(--bg);
        }

        .resumo-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .resumo-header h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
        }

        .resumo-header p {
          margin: 6px 0 0;
          color: var(--text-2);
        }

        .back-link {
          color: var(--green);
          text-decoration: none;
          font-weight: 600;
          white-space: nowrap;
        }

        .period-nav {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          border: 1px solid var(--border-2);
          border-radius: 999px;
          padding: 5px 9px;
          background: var(--bg-card);
        }

        .period-nav button {
          border: 0;
          background: var(--bg-surface);
          color: var(--text);
          border-radius: 8px;
          width: 30px;
          height: 30px;
          cursor: pointer;
        }

        .feedback {
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-2);
          background: var(--bg-card);
          margin-bottom: 16px;
        }

        .feedback.error {
          border-color: color-mix(in srgb, var(--red) 38%, transparent);
          color: var(--red);
          background: var(--red-dim);
        }

        .saldo-card {
          border: 1px solid var(--border-green);
          border-radius: var(--radius-xl);
          background: var(--green-dim);
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: var(--shadow-card);
        }

        .saldo-main {
          display: block;
          margin-top: 8px;
          font-size: 32px;
          color: var(--green-text);
          font-family: var(--font-mono);
          line-height: 1.1;
        }

        .saldo-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
          color: var(--text-2);
          font-size: 13px;
        }

        .insights {
          margin-bottom: 14px;
          display: grid;
          gap: 8px;
        }

        .insight {
          border-radius: var(--radius-md);
          padding: 10px 12px;
          border: 1px solid transparent;
          font-size: 14px;
        }

        .insight.warn {
          background: var(--blue-dim);
          border-color: var(--blue);
          color: var(--text-2);
        }

        .insight.good {
          background: var(--blue-dim);
          border-color: var(--blue);
          color: var(--text-2);
        }

        .blocos-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .bloco-card {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bloco-card header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .bloco-card .icon {
          font-size: 22px;
          line-height: 1;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          background: var(--green-dim);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .bloco-card h3 {
          margin: 0;
          font-size: 15px;
          font-family: var(--font-display);
          font-weight: 700;
        }

        .bloco-card small {
          font-size: 11px;
        }

        .status-badge {
          display: inline-flex;
          margin-top: 3px;
          border-radius: 999px;
          padding: 3px 8px;
          border: 1px solid var(--border-2);
          color: var(--text-2);
          background: var(--bg-surface);
        }

        .status-badge.completo {
          border-color: var(--green-mid);
          color: var(--green);
          background: var(--green-dim);
        }

        .status-badge.acima {
          border-color: var(--red);
          color: var(--red);
          background: var(--red-dim);
        }

        .status-badge.pendente {
          border-color: rgba(255, 213, 79, 0.35);
          color: var(--gold);
          background: var(--gold-dim);
        }

        .status-badge.vazio {
          border-color: var(--border-2);
          color: var(--text-3);
          background: var(--bg-surface);
        }

        .totais {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        @media (max-width: 920px) {
          .saldo-grid,
          .blocos-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
