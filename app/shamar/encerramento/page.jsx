'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IndexCard, ProgressSummary, ShamarCard, ShamarHeader, ShamarLoading, ShamarSetupError, ShamarShell } from '@/components/shamar/ShamarUI';
import { modePath } from '@/components/shamar/ShamarModeCreator';
import { formatMoney, identityIcon, identityLabel } from '@/src/lib/shamar/formatters';

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.error || 'Erro na requisição');
  return payload;
}

export default function ShamarClosingPage() {
  const [summary, setSummary] = useState(null);
  const [patrimonioFinal, setPatrimonioFinal] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('');

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode') || '';
    const nextMode = ['individual', 'dupla', 'tribo'].includes(requestedMode) ? requestedMode : '';
    setMode(nextMode);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const path = nextMode ? `/api/shamar/seasons?mode=${encodeURIComponent(nextMode)}` : '/api/shamar/seasons';
        const payload = await apiRequest(path);
        if (!mounted) return;
        setSummary(payload);
        const suggested = Number(payload?.progress?.contributions_total || payload?.progress?.sum_marked || 0);
        if (suggested > 0) setPatrimonioFinal(String(suggested));
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Erro ao carregar temporada');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const season = summary?.season || null;
  const config = summary?.config || season?.config || null;
  const progress = summary?.progress || null;
  const identity = result?.identity_level || summary?.index?.identity_level || season?.identity_level || 'guardiao';
  const delta = useMemo(() => {
    const initial = Number(season?.patrimonio_inicial || 0);
    const finalValue = Number(result?.season?.patrimonio_final || patrimonioFinal || 0);
    return finalValue - initial;
  }, [patrimonioFinal, result, season?.patrimonio_inicial]);

  const submit = async (event) => {
    event.preventDefault();
    if (!season?.id) return;

    setSaving(true);
    setError('');
    try {
      const payload = await apiRequest(`/api/shamar/seasons/${encodeURIComponent(season.id)}/complete`, {
        method: 'POST',
        body: JSON.stringify({ patrimonio_final: Number(String(patrimonioFinal).replace(',', '.')) })
      });
      setResult(payload);
    } catch (submitError) {
      setError(submitError.message || 'Erro ao encerrar temporada');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ShamarLoading label="Preparando encerramento..." />;
  if (error && !summary) return <ShamarSetupError error={error} />;
  if (!season) return <ShamarSetupError error="Nenhuma temporada SHAMAR ativa encontrada para encerramento." />;

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        label="Encerramento"
        title="Fechamento SHAMAR"
        subtitle={result ? 'Sua temporada foi registrada.' : 'Declare seu patrimônio final para concluir a temporada.'}
        identity={identity}
        hrefBack={mode ? modePath(mode) : '/shamar'}
        stats={[
          { label: 'Turma', value: config?.turma || 'SHAMAR' },
          { label: 'Meta', value: formatMoney(config?.meta_total || progress?.meta_total || 0, { compact: true }) },
          { label: 'Índice', value: result?.index?.index_total || summary?.index?.index_total || 0 }
        ]}
      />

      {error ? <div className="shamar-error">{error}</div> : null}

      {!result ? (
        <>
          <ProgressSummary progress={progress} config={config} />

          <ShamarCard title="Patrimônio final">
            <form className="closing-form" onSubmit={submit}>
              <label>
                Valor final declarado
                <input
                  value={patrimonioFinal}
                  onChange={(event) => setPatrimonioFinal(event.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                />
              </label>
              <div className="closing-preview">
                <span>Patrimônio inicial</span>
                <strong>{formatMoney(season.patrimonio_inicial || 0)}</strong>
                <span>Transformação</span>
                <strong className={delta >= 0 ? 'positive' : 'negative'}>{formatMoney(delta)}</strong>
              </div>
              <button type="submit" disabled={saving}>
                {saving ? 'Encerrando...' : 'Encerrar temporada'}
              </button>
            </form>
          </ShamarCard>
        </>
      ) : (
        <>
          <section className="gold-plate">
            <div className="plate-mark">{identityIcon(identity)}</div>
            <span>Placa digital SHAMAR</span>
            <h2>{identityLabel(identity)}</h2>
            <p>Temporada concluída com transformação patrimonial registrada.</p>
            <div className="plate-metrics">
              <div>
                <strong>{formatMoney(result.season?.patrimonio_final || 0)}</strong>
                <span>patrimônio final</span>
              </div>
              <div>
                <strong>{formatMoney(delta)}</strong>
                <span>transformação</span>
              </div>
              <div>
                <strong>{result.index?.index_total || 0}</strong>
                <span>índice SHAMAR</span>
              </div>
            </div>
          </section>

          <IndexCard indexData={result.index} />

          <div className="next-actions">
            <Link href={mode ? modePath(mode) : '/shamar'}>Voltar ao SHAMAR</Link>
            <Link href="/jornada">Ver conquistas</Link>
            <Link href="/app">Continuar no app</Link>
          </div>
        </>
      )}

      <style jsx>{`
        .shamar-error {
          border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
          background: color-mix(in srgb, var(--red) 8%, transparent);
          color: var(--red);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-weight: 800;
        }

        .closing-form {
          display: grid;
          gap: 14px;
        }

        label {
          display: grid;
          gap: 7px;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        input {
          border: 1px solid var(--border-green);
          border-radius: 10px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 13px 14px;
          font: inherit;
          font-size: 20px;
          font-weight: 900;
        }

        .closing-preview {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-surface);
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px 12px;
        }

        .closing-preview span {
          color: var(--muted);
        }

        .positive {
          color: var(--green-dark);
        }

        .negative {
          color: var(--red);
        }

        button,
        .next-actions a {
          border: 1px solid var(--shamar-gold);
          border-radius: 10px;
          background: var(--shamar-gold);
          color: #1b1500;
          padding: 12px 14px;
          font: inherit;
          font-weight: 900;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .gold-plate {
          border: 1px solid color-mix(in srgb, var(--shamar-gold) 60%, transparent);
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(255, 215, 0, 0.24), rgba(27, 94, 32, 0.12)),
            var(--bg-card);
          padding: 22px;
          text-align: center;
          box-shadow: 0 18px 40px rgba(255, 215, 0, 0.16);
          margin-bottom: 14px;
        }

        .plate-mark {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          background: var(--shamar-gold);
          color: #1b1500;
          font-size: 36px;
        }

        .gold-plate span {
          color: var(--shamar-gold);
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .gold-plate h2 {
          margin: 6px 0;
          font-size: 34px;
          font-family: var(--font-display);
        }

        .gold-plate p {
          margin: 0;
          color: var(--text-2);
        }

        .plate-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 16px;
        }

        .plate-metrics div {
          border: 1px solid color-mix(in srgb, var(--shamar-gold) 30%, transparent);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          padding: 10px;
        }

        .plate-metrics strong,
        .plate-metrics span {
          display: block;
        }

        .plate-metrics strong {
          font-size: 18px;
          color: var(--text);
        }

        .plate-metrics span {
          margin-top: 4px;
          color: var(--muted);
          text-transform: none;
          letter-spacing: 0;
          font-size: 11px;
        }

        .next-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .next-actions a:nth-child(2) {
          background: var(--green);
          border-color: var(--green);
          color: #03140b;
        }

        .next-actions a:nth-child(3) {
          background: var(--bg-surface);
          border-color: var(--border);
          color: var(--text);
        }

        @media (max-width: 680px) {
          .plate-metrics,
          .next-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
