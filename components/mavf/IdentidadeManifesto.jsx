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
            border: 1px dashed #62528a;
            border-radius: 14px;
            background: rgba(167, 139, 250, 0.09);
            padding: 16px;
            text-align: center;
          }

          .empty-icon {
            font-size: 28px;
            margin-bottom: 6px;
          }

          h4 {
            margin: 0 0 6px;
            color: #dacfff;
            font-size: 16px;
          }

          p {
            margin: 0;
            color: #b9afd8;
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
          border: 1px solid #4f4371;
          border-radius: 14px;
          background: linear-gradient(180deg, #161222 0%, #110f1a 100%);
          padding: 14px;
        }

        .manifest-title {
          margin-bottom: 10px;
          color: #d5c7ff;
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
          border: 1px solid #372f4f;
          border-radius: 10px;
          background: #19142a;
          padding: 10px;
        }

        .manifest-text {
          margin: 0;
          color: #f4f0ff;
          font-weight: 700;
          line-height: 1.4;
        }

        .manifest-meta {
          margin-top: 6px;
          color: #a698ca;
          font-size: 11px;
        }

        .manifest-context {
          margin: 6px 0 0;
          color: #c1b4e2;
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>
    </section>
  );
}
