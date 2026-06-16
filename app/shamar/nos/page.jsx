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
import { formatMoney, identityLabel } from '@/src/lib/shamar/formatters';

function PersonCard({ title, person }) {
  return (
    <div className="nos-person">
      <div className="nos-avatar">{person?.avatar || '?'}</div>
      <span>{title}</span>
      <strong>{person?.name || 'Aguardando'}</strong>
      <dl>
        <div><dt>Patrimônio</dt><dd>{formatMoney(person?.patrimonio || 0)}</dd></div>
        <div><dt>Quadrinhos</dt><dd>{Number(person?.squares_marked || 0)}</dd></div>
        <div><dt>Sequência</dt><dd>{Number(person?.weeks || 0)} semanas</dd></div>
        <div><dt>Identidade</dt><dd>{identityLabel(person?.identity_level)}</dd></div>
      </dl>
    </div>
  );
}

export default function ShamarNosPage() {
  const { season, locked, unlockProgress, error, isLoading } = useShamar();
  const [data, setData] = useState(null);
  const [nosError, setNosError] = useState(null);
  const [isNosLoading, setIsNosLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadNos = async () => {
      if (!season?.id) return;
      setIsNosLoading(true);
      setNosError(null);

      try {
        const res = await fetch(`/api/shamar/nos?season_id=${encodeURIComponent(season.id)}`, { cache: 'no-store' });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || 'shamar_nos_fetch_failed');
        if (active) setData(payload);
      } catch (fetchError) {
        if (active) {
          setData(null);
          setNosError(fetchError?.message || 'shamar_nos_fetch_failed');
        }
      } finally {
        if (active) setIsNosLoading(false);
      }
    };

    loadNos();
    return () => {
      active = false;
    };
  }, [season?.id]);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  const hasPartnership = data?.partnership && !data?.invite;

  return (
    <ShamarShell activeTab="shamar" blue>
      <ShamarHeader
        blue
        hrefBack="/shamar"
        label="Camada 2 · NÓS"
        title={hasPartnership ? 'NÓS' : 'Convide alguém para a Jornada NÓS'}
        subtitle={hasPartnership ? 'Parceria ativa de constância patrimonial.' : 'Uma dupla para prestar contas sem misturar histórias pessoais.'}
        stats={[
          { label: 'Status', value: hasPartnership ? 'Ativa' : 'Convite' },
          { label: 'Patrimônio', value: formatMoney(data?.patrimonio_conjunto || 0, { compact: true }) },
          { label: 'Privacidade', value: 'Preservada' }
        ]}
      />

      {isNosLoading ? <ShamarCard><p className="nos-muted">Carregando NÓS...</p></ShamarCard> : null}
      {nosError ? <ShamarCard><p className="nos-muted">{nosError}</p></ShamarCard> : null}

      {!hasPartnership ? (
        <>
          <ShamarCard title="Convite">
            <div className="nos-invite">
              <input placeholder="Email ou código de convite" />
              <button type="button">Enviar convite</button>
            </div>
          </ShamarCard>
          <ShamarCard title="Como funciona">
            <div className="nos-benefits">
              <p>Vocês acompanham constância, quadrinhos e evolução sem expor detalhes sensíveis.</p>
              <p>Se a parceria encerrar, seu histórico permanece.</p>
              <p>O SHAMAR não interfere em questões pessoais.</p>
            </div>
          </ShamarCard>
        </>
      ) : (
        <>
          <ShamarCard title="Comparativo">
            <div className="nos-grid">
              <PersonCard title="Você" person={data.current} />
              <PersonCard title="Parceiro" person={data.partner} />
            </div>
          </ShamarCard>

          <section className="nos-total">
            <span>Patrimônio conjunto</span>
            <strong>{formatMoney(data.patrimonio_conjunto || 0)}</strong>
          </section>

          <ShamarCard title="Nota de privacidade">
            <div className="nos-benefits">
              <p>Se a parceria encerrar, seu histórico permanece.</p>
              <p>O SHAMAR não interfere em questões pessoais.</p>
            </div>
          </ShamarCard>
        </>
      )}

      <style jsx>{`
        .nos-muted {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
        }

        .nos-invite {
          display: grid;
          gap: 10px;
        }

        .nos-invite input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-input);
          padding: 12px 14px;
          outline: none;
        }

        .nos-invite button {
          border: 0;
          border-radius: var(--radius-md);
          background: var(--blue);
          color: white;
          font-weight: 900;
          padding: 13px 16px;
        }

        .nos-benefits {
          display: grid;
          gap: 10px;
        }

        .nos-benefits p {
          margin: 0;
          color: var(--text2);
          font-size: 13px;
          line-height: 1.6;
        }

        .nos-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .nos-person {
          border-radius: 12px;
          background: var(--blue-dim);
          padding: 14px;
          text-align: center;
        }

        .nos-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--blue);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .nos-person > span {
          display: block;
          color: var(--text3);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .nos-person > strong {
          display: block;
          color: var(--text);
          font-size: 14px;
          font-weight: 900;
          margin: 3px 0 10px;
        }

        dl {
          margin: 0;
          display: grid;
          gap: 8px;
        }

        dl div {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          border-top: 1px solid rgba(21, 101, 192, 0.14);
          padding-top: 8px;
        }

        dt,
        dd {
          margin: 0;
          font-size: 11px;
        }

        dt {
          color: var(--text3);
        }

        dd {
          color: var(--blue);
          font-family: var(--font-mono);
          font-weight: 900;
          text-align: right;
        }

        .nos-total {
          border-radius: var(--radius-xl);
          background: var(--shamar-gold-dim);
          border: 1px solid var(--gold-mid);
          text-align: center;
          padding: 18px;
          margin-bottom: 14px;
        }

        .nos-total span {
          display: block;
          color: var(--gold-dark);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .nos-total strong {
          display: block;
          color: var(--gold-dark);
          font-family: var(--font-mono);
          font-size: 24px;
          margin-top: 4px;
        }

        @media (max-width: 560px) {
          .nos-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </ShamarShell>
  );
}
