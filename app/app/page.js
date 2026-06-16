'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import FinanceSummaryCard from '@/components/finance/FinanceSummaryCard';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavHub from '@/components/layout/BottomNavHub';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import NavigationCard from '@/components/layout/NavigationCard';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function nowPeriod() {
  const date = new Date();
  return {
    month: pad2(date.getMonth() + 1),
    year: String(date.getFullYear())
  };
}

function ShamarHomeCard({ summary }) {
  const progress = summary?.progress || {};
  const index = summary?.index || progress?.current_index || {};
  const identity = String(index?.identity_level || summary?.season?.identity_level || 'guardiao');
  const identityName = {
    guardiao: 'Guardião',
    construtor: 'Construtor',
    cultivador: 'Cultivador',
    multiplicador: 'Multiplicador',
    legado: 'Legado'
  }[identity] || 'Guardião';
  const accumulated = Number(progress?.contributions_total || progress?.sum_marked || 0);

  return (
    <Link href="/shamar" className="shamar-home-card">
      <span className="shamar-home-icon">🛡️</span>
      <span className="shamar-home-copy">
        <strong>SHAMAR</strong>
        <em>{identityName} · {accumulated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</em>
      </span>
      <span className="shamar-home-arrow">→</span>
      <style jsx>{`
        .shamar-home-card {
          grid-column: 1 / -1;
          min-height: 96px;
          border-radius: var(--radius-xl);
          border: 1px solid rgba(27, 94, 32, 0.32);
          background: var(--shamar-dark);
          color: white;
          box-shadow: 0 4px 18px rgba(27, 94, 32, 0.22);
          padding: 18px;
          display: grid;
          grid-template-columns: 52px 1fr 28px;
          align-items: center;
          gap: 12px;
        }

        .shamar-home-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255,255,255,0.14);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }

        .shamar-home-copy strong {
          display: block;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .shamar-home-copy em {
          display: block;
          color: rgba(255,255,255,0.72);
          font-family: var(--font-mono);
          font-size: 12px;
          font-style: normal;
          margin-top: 3px;
        }

        .shamar-home-arrow {
          color: var(--shamar-gold);
          font-size: 24px;
          font-weight: 900;
          text-align: right;
        }
      `}</style>
    </Link>
  );
}

// CLAUDE-HANDOFF-MARKER: Home Hub V1 concluída com resumo financeiro, cards de navegação calibrados,
// personalização no header e navegação inferior com atalho MAVF.
export default function HomeHubPage() {
  const [isIAOpen, setIsIAOpen] = useState(false);
  const [isLoadingFinance, setIsLoadingFinance] = useState(true);
  const [financialData, setFinancialData] = useState(null);
  const [shamarSummary, setShamarSummary] = useState(null);
  const period = useMemo(() => nowPeriod(), []);

  useEffect(() => {
    let active = true;

    const loadFinance = async () => {
      setIsLoadingFinance(true);
      try {
        const response = await fetch(`/api/finance/month?month=${period.month}&year=${period.year}`, {
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || 'Não foi possível carregar o resumo financeiro.');
        }

        if (active) {
          setFinancialData(payload?.data || null);
        }
      } catch (_) {
        if (active) {
          setFinancialData(null);
        }
      } finally {
        if (active) {
          setIsLoadingFinance(false);
        }
      }
    };

    loadFinance();

    return () => {
      active = false;
    };
  }, [period.month, period.year]);

  useEffect(() => {
    let active = true;

    const loadShamar = async () => {
      try {
        const response = await fetch('/api/shamar/seasons', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'shamar_unavailable');

        if (active && payload?.profile?.shamar_unlocked && !payload?.locked) {
          setShamarSummary(payload);
        }
      } catch (_) {
        if (active) setShamarSummary(null);
      }
    };

    loadShamar();

    return () => {
      active = false;
    };
  }, []);

  const navigationCards = [
    { icon: '💰', label: 'Finanças', href: '/financas' },
    { icon: '📚', label: 'Educação', href: '/conteudo' },
    { icon: '👥', label: 'Comunidade', href: '/turma' },
    { icon: '🏆', label: 'Conquistas', href: '/jornada' }
  ];

  return (
    <div className="home-hub-screen">
      <AppHeader />

      <main className="home-hub-main page-content">
        <section className="home-hub-finance">
          <FinanceSummaryCard data={financialData || {}} mes={period.month} ano={period.year} isLoading={isLoadingFinance} />
        </section>

        <div className="home-hub-explore-label">ONDE VOCÊ QUER IR?</div>
        <section className="home-hub-nav-grid" aria-label="Acessos principais">
          {navigationCards.map((card, index) => (
            <Fragment key={card.href}>
              <NavigationCard icon={card.icon} label={card.label} href={card.href} />
              {index === 2 && shamarSummary ? <ShamarHomeCard summary={shamarSummary} /> : null}
            </Fragment>
          ))}
        </section>
      </main>

      <FAB onClick={() => setIsIAOpen(true)} />
      <BottomNavHub />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />
    </div>
  );
}
