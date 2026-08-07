'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ShamarCard,
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { useShamar } from '@/hooks/useShamar';
import { clampPercent, formatMoney } from '@/src/lib/shamar/formatters';

function goalName(config) {
  const name = String(config?.turma || '').split('·').slice(1).join('·').trim();
  return name || 'Minha reserva de segurança';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function ShamarDashboard() {
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const { season, seasons, config, progress, locked, unlockProgress, error, isLoading } = useShamar('', selectedSeasonId);
  const [contributions, setContributions] = useState([]);

  useEffect(() => {
    let active = true;
    if (!season?.id) {
      setContributions([]);
      return () => { active = false; };
    }
    fetch(`/api/shamar/contributions?season_id=${encodeURIComponent(season.id)}`, { cache: 'no-store' })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => { if (active && ok) setContributions(data?.contributions || []); })
      .catch(() => { if (active) setContributions([]); });
    return () => { active = false; };
  }, [season?.id]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return contributions.reduce((total, item) => {
      const date = new Date(`${String(item.contributed_at).slice(0, 10)}T12:00:00`);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        ? total + Number(item.amount || 0)
        : total;
    }, 0);
  }, [contributions]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  if (!season || !config) {
    return (
      <ShamarShell activeTab="overview">
        <ShamarHeader label="SHAMAR" title="Guardar hoje. Respirar amanhã." subtitle="Uma ferramenta simples para transformar intenção em reserva." />
        <section className="shamar-story">
          <span>🛡️</span>
          <div>
            <h2>O que é o SHAMAR?</h2>
            <p>No ZeroApp, SHAMAR é o compromisso de guardar uma parte do presente para proteger suas escolhas futuras. Um passo de cada vez, no seu ritmo.</p>
          </div>
        </section>
        <ShamarCard title="Como funciona">
          <div className="shamar-steps">
            <div><b>1</b><span><strong>Defina sua meta</strong><small>Escolha quanto deseja guardar.</small></span></div>
            <div><b>2</b><span><strong>Faça seus aportes</strong><small>Registre cada valor reservado.</small></span></div>
            <div><b>3</b><span><strong>Veja sua segurança crescer</strong><small>Acompanhe sua evolução até a meta.</small></span></div>
          </div>
        </ShamarCard>
        <Link className="shamar-primary-action" href="/shamar/criar">CRIAR MINHA META</Link>
        <DashboardStyles />
      </ShamarShell>
    );
  }

  const accumulated = Number(progress?.contributions_total || 0);
  const meta = Number(config?.meta_total || progress?.meta_total || 0);
  const pct = meta > 0 ? clampPercent((accumulated / meta) * 100) : 0;
  const milestoneStep = 25;
  const nextPct = Math.min(100, Math.max(milestoneStep, Math.ceil((pct + 0.01) / milestoneStep) * milestoneStep));
  const nextAmount = meta * (nextPct / 100);
  const remainingToMilestone = Math.max(0, nextAmount - accumulated);
  const seasonQuery = `season_id=${encodeURIComponent(season.id)}`;

  return (
    <ShamarShell activeTab="overview">
      <ShamarHeader label="Meu SHAMAR" title={goalName(config)} subtitle="Sua reserva cresce a cada escolha de guardar." />

      {seasons.length > 1 ? (
        <label className="goal-selector">
          <span>Meta ativa</span>
          <select value={season.id} onChange={(event) => setSelectedSeasonId(event.target.value)}>
            {seasons.map((item) => <option key={item.id} value={item.id}>{goalName(item.config)}</option>)}
          </select>
        </label>
      ) : null}

      <section className="savings-card">
        <span>Você já guardou</span>
        <strong>{formatMoney(accumulated)}</strong>
        <div className="savings-meta"><span>Meta: {formatMoney(meta)}</span><b>{Math.round(pct)}%</b></div>
        <div className="savings-track"><div style={{ width: `${pct}%` }} /></div>
        <Link href={`/shamar/aporte/novo?${seasonQuery}`}>+ FAZER UM APORTE</Link>
      </section>

      <div className="savings-metrics">
        <div><span>Guardado este mês</span><strong>{formatMoney(monthTotal)}</strong></div>
        <div><span>Aportes realizados</span><strong>{contributions.length}</strong></div>
      </div>

      <section className="milestone-card">
        <div><span>Próximo marco</span><strong>{nextPct}% da sua meta</strong></div>
        <b>{remainingToMilestone > 0 ? `Faltam ${formatMoney(remainingToMilestone)}` : 'Meta alcançada'}</b>
      </section>

      <ShamarCard title="Últimos aportes" action={<Link className="history-link" href={`/shamar/historico?${seasonQuery}`}>Ver histórico</Link>}>
        {contributions.length ? (
          <div className="contribution-list">
            {contributions.slice(0, 3).map((item) => (
              <div key={item.id}>
                <span><b>↗</b><span><strong>{item.observation || 'Aporte realizado'}</strong><small>{formatDate(item.contributed_at)}</small></span></span>
                <strong>{formatMoney(item.amount)}</strong>
              </div>
            ))}
          </div>
        ) : <p className="empty-contributions">Seu primeiro aporte vai aparecer aqui.</p>}
      </ShamarCard>
      <DashboardStyles />
    </ShamarShell>
  );
}

export function ShamarDashboardStyles() {
  return <DashboardStyles />;
}

function DashboardStyles() {
  return <style jsx global>{`
    .shamar-story { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: start; border: 1px solid rgba(27,94,32,.16); border-radius: var(--radius-xl); background: var(--shamar-dim); padding: 18px; margin-bottom: 14px; }
    .shamar-story > span { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 16px; background: white; font-size: 24px; }
    .shamar-story h2 { margin: 0 0 5px; color: var(--shamar-dark); font-size: 17px; }
    .shamar-story p { margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6; }
    .shamar-steps { display: grid; gap: 15px; }
    .shamar-steps > div { display: grid; grid-template-columns: 34px 1fr; gap: 11px; align-items: center; }
    .shamar-steps b { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: var(--shamar-dim); color: var(--shamar-dark); }
    .shamar-steps span, .shamar-steps small { display: block; }
    .shamar-steps strong { color: var(--text); font-size: 13px; }
    .shamar-steps small { color: var(--text3); margin-top: 2px; }
    .shamar-primary-action { display: flex; justify-content: center; border-radius: var(--radius-md); background: var(--shamar-dark); color: white; padding: 16px; font-weight: 900; box-shadow: 0 6px 20px rgba(27,94,32,.22); }
    .goal-selector { display: grid; gap: 6px; margin-bottom: 14px; color: var(--text3); font-size: 11px; font-weight: 800; }
    .goal-selector select { width: 100%; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-card); color: var(--text); padding: 12px 13px; font: inherit; font-weight: 800; }
    .savings-card { border-radius: 24px; background: linear-gradient(145deg, #174f31, #0d3822); color: white; padding: 22px; margin-bottom: 14px; box-shadow: 0 12px 32px rgba(13,56,34,.2); }
    .savings-card > span { display: block; color: rgba(255,255,255,.72); font-size: 12px; font-weight: 800; }
    .savings-card > strong { display: block; font-family: var(--font-mono); font-size: clamp(30px, 7vw, 44px); margin: 6px 0 15px; }
    .savings-meta { display: flex; justify-content: space-between; font-size: 12px; }
    .savings-track { height: 9px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.18); margin: 8px 0 18px; }
    .savings-track div { height: 100%; border-radius: inherit; background: #d7b85b; }
    .savings-card > a { display: flex; justify-content: center; border-radius: 12px; background: white; color: var(--shamar-dark); padding: 14px; font-weight: 900; }
    .savings-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .savings-metrics > div { border: 1px solid var(--border); border-radius: 16px; background: var(--bg-card); padding: 15px; }
    .savings-metrics span { display: block; color: var(--text3); font-size: 11px; margin-bottom: 7px; }
    .savings-metrics strong { color: var(--shamar-dark); font-size: 16px; }
    .milestone-card { display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 1px solid rgba(215,184,91,.35); border-radius: 16px; background: rgba(215,184,91,.1); padding: 15px; margin-bottom: 14px; }
    .milestone-card span, .milestone-card strong { display: block; }
    .milestone-card span { color: var(--text3); font-size: 11px; margin-bottom: 3px; }
    .milestone-card strong { color: var(--text); font-size: 13px; }
    .milestone-card > b { color: #7a5a00; font-size: 12px; }
    .history-link { color: var(--shamar-dark); font-size: 12px; font-weight: 900; }
    .contribution-list { display: grid; gap: 11px; }
    .contribution-list > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    .contribution-list > div:last-child { border: 0; padding-bottom: 0; }
    .contribution-list > div > span { display: flex; align-items: center; gap: 9px; }
    .contribution-list > div > span > b { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: var(--shamar-dim); color: var(--shamar-dark); }
    .contribution-list span span, .contribution-list small { display: block; }
    .contribution-list strong { color: var(--shamar-dark); font-size: 13px; }
    .contribution-list small, .empty-contributions { color: var(--text3); font-size: 11px; }
    .empty-contributions { margin: 0; }
    @media (max-width: 420px) { .savings-metrics { grid-template-columns: 1fr; } .milestone-card { align-items: flex-start; flex-direction: column; } }
  `}</style>;
}
