'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
          <h1>Resumo Mensal</h1>
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
            <h2>Saldos do mês</h2>
            <div className="saldo-grid">
              <article>
                <span>Saldo realizado</span>
                <strong>{formatMoney(resumo.saldoRealizado)}</strong>
              </article>
              <article>
                <span>Saldo previsto</span>
                <strong>{formatMoney(resumo.saldoPrevisto)}</strong>
              </article>
              <article>
                <span>Ainda a sair</span>
                <strong>{formatMoney(resumo.aindaASair)}</strong>
              </article>
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
                    <small>{block.label}</small>
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

      <style jsx>{`
        .resumo-shell {
          max-width: 1080px;
          margin: 0 auto;
          padding: 28px 16px 120px;
          color: #f3f3f3;
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
          color: #9ea29f;
        }

        .back-link {
          color: #00c853;
          text-decoration: none;
          font-weight: 600;
          white-space: nowrap;
        }

        .period-nav {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          border: 1px solid #2f2f2f;
          border-radius: 999px;
          padding: 5px 9px;
        }

        .period-nav button {
          border: 0;
          background: #222;
          color: #f3f3f3;
          border-radius: 8px;
          width: 30px;
          height: 30px;
          cursor: pointer;
        }

        .feedback {
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #2f2f2f;
          background: #1d1d1d;
          margin-bottom: 16px;
        }

        .feedback.error {
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }

        .saldo-card {
          border: 1px solid #2f2f2f;
          border-radius: 14px;
          background: #1b1b1b;
          padding: 14px;
          margin-bottom: 14px;
        }

        .saldo-card h2 {
          margin: 0 0 10px;
          font-size: 17px;
        }

        .saldo-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .saldo-grid article {
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          padding: 10px;
          background: #141414;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .saldo-grid span {
          color: #9ea29f;
          font-size: 12px;
        }

        .saldo-grid strong {
          font-size: 18px;
        }

        .insights {
          margin-bottom: 14px;
          display: grid;
          gap: 8px;
        }

        .insight {
          border-radius: 10px;
          padding: 10px 12px;
          border: 1px solid transparent;
          font-size: 14px;
        }

        .insight.warn {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.35);
          color: #fcd34d;
        }

        .insight.good {
          background: rgba(0, 200, 83, 0.12);
          border-color: rgba(0, 200, 83, 0.35);
          color: #86efac;
        }

        .blocos-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .bloco-card {
          border: 1px solid #2f2f2f;
          border-radius: 14px;
          background: #171717;
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
        }

        .bloco-card h3 {
          margin: 0;
          font-size: 15px;
        }

        .bloco-card small {
          color: #9ea29f;
          font-size: 12px;
        }

        .totais {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: #9ea29f;
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
