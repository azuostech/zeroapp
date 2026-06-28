'use client';

import { useEffect, useMemo, useState } from 'react';
import FinanceSummaryCard from '@/components/finance/FinanceSummaryCard';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavHub from '@/components/layout/BottomNavHub';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import NavigationCard from '@/components/layout/NavigationCard';
import RestrictedAccessModal from '@/components/layout/RestrictedAccessModal';
import { hasStudentAccess } from '@/src/modules/profile/domain/access';

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

// CLAUDE-HANDOFF-MARKER: Home Hub V1 concluída com resumo financeiro, cards de navegação calibrados,
// personalização no header e navegação inferior com atalho MAVF.
export default function HomeHubPage() {
  const [isIAOpen, setIsIAOpen] = useState(false);
  const [isLoadingFinance, setIsLoadingFinance] = useState(true);
  const [financialData, setFinancialData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false);
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

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile/me', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok) {
          setProfile(payload?.profile || null);
        }
      } catch (_) {
        if (active) setProfile(null);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const canUseStudentAreas = hasStudentAccess(profile);
  const navigationCards = [
    { icon: '💰', label: 'Finanças', href: '/financas' },
    { icon: '📚', label: 'Educação', href: '/conteudo' },
    { icon: '👥', label: 'Comunidade', href: '/turma', locked: !canUseStudentAreas },
    { icon: '🛡️', label: 'SHAMAR', href: '/shamar', locked: !canUseStudentAreas }
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
          {navigationCards.map((card) => (
            <NavigationCard
              key={card.href}
              icon={card.icon}
              label={card.label}
              href={card.href}
              locked={card.locked}
              onLockedClick={() => setRestrictedModalOpen(true)}
            />
          ))}
        </section>
      </main>

      <FAB onClick={() => setIsIAOpen(true)} />
      <BottomNavHub />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />
      <RestrictedAccessModal isOpen={restrictedModalOpen} onClose={() => setRestrictedModalOpen(false)} />
    </div>
  );
}
