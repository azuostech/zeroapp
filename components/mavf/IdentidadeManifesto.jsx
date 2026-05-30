'use client';

import { formatShortDateLabel } from '@/src/modules/mavf/application/practices-format';

export default function IdentidadeManifesto({ declarations = [] }) {
  if (!Array.isArray(declarations) || declarations.length === 0) {
    return (
      <div className="manifest-empty">
        <div className="empty-icon">💎</div>
        <h4>Seu manifesto está em branco</h4>
        <p>Quem você está se tornando define o que você faz. Escreva sua primeira declaração.</p>

        <style jsx>{`
          .manifest-empty {
            border: 1px dashed var(--border-3);
            border-radius: var(--radius-lg);
            background: var(--purple-dim);
            padding: 16px;
            text-align: center;
          }

          .empty-icon {
            font-size: 28px;
            margin-bottom: 6px;
          }

          h4 {
            margin: 0 0 6px;
            color: var(--text);
            font-size: 16px;
          }

          p {
            margin: 0;
            color: var(--text-3);
            font-size: 13px;
            line-height: 1.4;
          }
        `}</style>
      </div>
    );
  }

  return (
    <section className="manifest">
      <div className="manifest-title">✦ Meu Manifesto Financeiro</div>
      <ul className="manifest-list">
        {declarations.map((item) => (
          <li key={item.id} className="manifest-item">
            <p className="manifest-text">Eu sou alguém que {item.declaracao}</p>
            <div className="manifest-meta">
              <span>{formatShortDateLabel(item.created_at)}</span>
              {item.encontro_ref ? <span>· {item.encontro_ref}</span> : null}
            </div>
            {item.contexto ? <p className="manifest-context">{item.contexto}</p> : null}
          </li>
        ))}
      </ul>

      <style jsx>{`
        .manifest {
          border: 1px solid rgba(179, 157, 219, 0.5);
          border-radius: var(--radius-lg);
          background: var(--purple-dim);
          padding: 14px;
        }

        .manifest-title {
          margin-bottom: 10px;
          color: var(--purple);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .manifest-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .manifest-item {
          border: 1px solid rgba(179, 157, 219, 0.35);
          border-radius: var(--radius-sm);
          background: color-mix(in srgb, var(--bg-surface) 84%, transparent);
          padding: 10px;
        }

        .manifest-text {
          margin: 0;
          color: var(--text);
          font-family: var(--font-display);
          font-weight: 700;
          line-height: 1.4;
        }

        .manifest-meta {
          margin-top: 6px;
          color: var(--text-3);
          font-size: 11px;
        }

        .manifest-context {
          margin: 6px 0 0;
          color: var(--text-2);
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
