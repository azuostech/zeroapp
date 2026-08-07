'use client';

import { useEffect, useState } from 'react';
import {
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { formatMoney } from '@/src/lib/shamar/formatters';

function formatDate(value) {
  if (!value) return '—';
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}

export default function ShamarHistoryPage() {
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const { season, locked, unlockProgress, error, isLoading } = useShamar('', selectedSeasonId);
  const [contributions, setContributions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setSelectedSeasonId(new URLSearchParams(window.location.search).get('season_id') || '');
  }, []);

  useEffect(() => {
    if (!season?.id) {
      setLoadingHistory(false);
      return;
    }
    fetch(`/api/shamar/contributions?season_id=${encodeURIComponent(season.id)}`, { cache: 'no-store' })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => { if (ok) setContributions(data?.contributions || []); })
      .finally(() => setLoadingHistory(false));
  }, [season?.id]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  const total = contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <ShamarShell activeTab="historico">
      <ShamarHeader hrefBack="/shamar" label="Meu SHAMAR" title="Histórico de aportes" subtitle="Cada registro é um passo na direção da sua segurança." stats={[
        { label: 'Aportes', value: contributions.length },
        { label: 'Total guardado', value: formatMoney(total, { compact: true }) }
      ]} />
      <ShamarCard title="Todos os aportes">
        {loadingHistory ? <p className="history-empty">Carregando...</p> : null}
        {!loadingHistory && !contributions.length ? <p className="history-empty">Nenhum aporte registrado ainda.</p> : null}
        <div className="history-list">
          {contributions.map((item) => (
            <div key={item.id}>
              <span><strong>{item.observation || 'Aporte realizado'}</strong><small>{formatDate(item.contributed_at)}</small></span>
              <strong>{formatMoney(item.amount)}</strong>
            </div>
          ))}
        </div>
      </ShamarCard>
      <style jsx>{`
        .history-list { display: grid; gap: 12px; }
        .history-list > div { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
        .history-list > div:last-child { border: 0; padding-bottom: 0; }
        .history-list span strong, .history-list small { display: block; }
        .history-list span strong { color: var(--text); font-size: 13px; }
        .history-list > div > strong { color: var(--shamar-dark); font-family: var(--font-mono); font-size: 14px; }
        .history-list small, .history-empty { color: var(--text3); font-size: 11px; margin-top: 3px; }
      `}</style>
    </ShamarShell>
  );
}
