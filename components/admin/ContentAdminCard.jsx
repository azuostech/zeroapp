'use client';

function resolveType(contentType) {
  const key = String(contentType || '').toLowerCase();
  if (key === 'video') return { label: 'Vídeo', icon: '🎬' };
  if (key === 'pdf') return { label: 'PDF', icon: '📄' };
  if (key === 'article') return { label: 'Artigo', icon: '📝' };
  if (key === 'tool') return { label: 'Ferramenta', icon: '🔧' };
  return { label: 'Conteúdo', icon: '📚' };
}

function resolveTier(tier) {
  const key = String(tier || '').toUpperCase();
  if (key === 'LIVRE') return { label: 'Livre', bg: 'rgba(0,200,83,0.14)', color: '#00c853' };
  if (key === 'MOVIMENTO') return { label: 'Mentorado', bg: 'rgba(255,215,0,0.16)', color: '#e1b500' };
  if (key === 'ACELERACAO') return { label: 'Aceleração', bg: 'rgba(66,165,245,0.16)', color: '#42a5f5' };
  if (key === 'AUTOGOVERNO') return { label: 'Autogoverno', bg: 'rgba(171,71,188,0.16)', color: '#ab47bc' };
  return { label: key || 'Livre', bg: 'rgba(0,200,83,0.14)', color: '#00c853' };
}

function truncateUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'Sem URL';
  return value.length > 60 ? `${value.slice(0, 57)}...` : value;
}

export default function ContentAdminCard({ item, onTogglePublish, onEdit, onDelete, onUpdateOrder, isBusy = false }) {
  const type = resolveType(item?.content_type);
  const tier = resolveTier(item?.tier_required);

  const handleToggle = () => {
    onTogglePublish?.(item, !Boolean(item?.is_published));
  };

  const handleDelete = () => {
    const ok = window.confirm(`Remover "${item?.title || 'este conteúdo'}"?`);
    if (!ok) return;
    onDelete?.(item);
  };

  const handleOrderBlur = (event) => {
    if (!onUpdateOrder) return;
    const next = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(next) || next === Number(item?.order_index || 0)) return;
    onUpdateOrder(item, next);
  };

  return (
    <article className={`content-admin-card ${item?.is_published ? '' : 'draft'}`}>
      <div className="thumb" aria-hidden="true">
        {item?.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" />
        ) : (
          <span>{type.icon}</span>
        )}
      </div>

      <div className="main">
        <div className="head-row">
          <h3>{item?.title || 'Sem título'}</h3>
          <label className="switch-wrap">
            <input type="checkbox" checked={Boolean(item?.is_published)} onChange={handleToggle} disabled={isBusy} />
            <span>{item?.is_published ? 'Publicado' : 'Rascunho'}</span>
          </label>
        </div>

        <p className="description">{item?.description || 'Sem descrição.'}</p>

        <div className="meta-row">
          <span className="badge type-badge">
            {type.icon} {type.label}
          </span>
          <span className="badge tier-badge" style={{ color: tier.color, background: tier.bg }}>
            {tier.label}
          </span>
          <label className="order-input">
            Ordem
            <input type="number" defaultValue={Number(item?.order_index || 0)} onBlur={handleOrderBlur} disabled={isBusy} />
          </label>
        </div>

        <a href={item?.url || '#'} target="_blank" rel="noreferrer" className={`url ${item?.url ? '' : 'disabled'}`}>
          {truncateUrl(item?.url)}
        </a>
      </div>

      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => onEdit?.(item)} disabled={isBusy}>
          Editar
        </button>
        <button type="button" className="btn danger" onClick={handleDelete} disabled={isBusy}>
          Deletar
        </button>
      </div>

      <style jsx>{`
        .content-admin-card {
          border: 1px solid var(--admin-border, #333);
          border-radius: 14px;
          background: var(--admin-surface, #1a1a1a);
          display: grid;
          grid-template-columns: 88px 1fr auto;
          gap: 14px;
          padding: 14px;
        }

        .content-admin-card.draft {
          opacity: 0.8;
        }

        .thumb {
          width: 88px;
          height: 88px;
          border-radius: 12px;
          border: 1px solid var(--admin-border, #333);
          background: #121212;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .main {
          min-width: 0;
        }

        .head-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.2;
        }

        .switch-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--admin-dim, #a6a6a6);
        }

        .description {
          margin: 6px 0 10px;
          color: var(--admin-dim, #a6a6a6);
          font-size: 13px;
          line-height: 1.35;
        }

        .meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .type-badge {
          border: 1px solid var(--admin-border, #333);
          color: var(--admin-dim, #a6a6a6);
        }

        .order-input {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--admin-dim, #a6a6a6);
        }

        .order-input input {
          width: 64px;
          border: 1px solid var(--admin-border, #333);
          border-radius: 8px;
          background: transparent;
          color: var(--admin-text, #fff);
          padding: 5px 7px;
          font-size: 12px;
        }

        .url {
          margin-top: 10px;
          display: inline-block;
          color: #42a5f5;
          text-decoration: none;
          font-size: 12px;
          word-break: break-all;
        }

        .url.disabled {
          pointer-events: none;
          color: var(--admin-dim, #a6a6a6);
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
        }

        .btn {
          border: 1px solid var(--admin-border, #333);
          border-radius: 9px;
          background: transparent;
          color: var(--admin-text, #fff);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 10px;
          cursor: pointer;
        }

        .btn.ghost:hover {
          border-color: #42a5f5;
        }

        .btn.danger {
          color: #ff5f5f;
        }

        .btn.danger:hover {
          border-color: #ff5f5f;
        }

        @media (max-width: 880px) {
          .content-admin-card {
            grid-template-columns: 72px 1fr;
          }

          .thumb {
            width: 72px;
            height: 72px;
            font-size: 28px;
          }

          .actions {
            grid-column: span 2;
            flex-direction: row;
            justify-content: flex-end;
          }
        }
      `}</style>
    </article>
  );
}
