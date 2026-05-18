'use client';

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const normalized = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyInput(value, fallback = '0') {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  return fallback;
}

export default function ItemRow({ item, onToggle, onUpdate, onRemove, readOnly = false }) {
  const safeItem = item && typeof item === 'object' ? item : {};
  const realized = Boolean(safeItem.realized);

  const previsto = parseMoney(safeItem.valor_previsto ?? safeItem.valor ?? '0');
  const realizado = parseMoney(safeItem.valor_realizado ?? '0');
  const acima = realized && realizado > previsto && previsto >= 0;

  const handleToggle = () => {
    if (readOnly || typeof onToggle !== 'function') return;

    if (realized) {
      onToggle(false, '0');
      return;
    }

    const defaultRealizado = moneyInput(safeItem.valor_realizado, moneyInput(safeItem.valor_previsto ?? safeItem.valor, '0'));
    onToggle(true, defaultRealizado);
  };

  return (
    <div className={`item-row ${realized ? 'is-realized' : ''}`}>
      <button
        type="button"
        className={`item-check ${realized ? 'checked' : ''}`}
        onClick={handleToggle}
        disabled={readOnly}
        aria-label={realized ? 'Marcar como pendente' : 'Marcar como realizado'}
      >
        {realized ? '✓' : ''}
      </button>

      <div className="item-content">
        <div className="item-main">
          <input
            type="text"
            value={safeItem.nome || ''}
            onChange={(e) => onUpdate?.('nome', e.target.value)}
            className="item-name"
            placeholder="Nome do item"
            readOnly={readOnly}
          />

          {acima ? <span className="badge-acima">⚠ Acima</span> : null}
        </div>

        <div className="item-values">
          <label className="field">
            <span>Previsto</span>
            <input
              type="text"
              inputMode="decimal"
              value={moneyInput(safeItem.valor_previsto ?? safeItem.valor, '0')}
              onChange={(e) => onUpdate?.('valor_previsto', e.target.value)}
              readOnly={readOnly}
            />
          </label>

          {realized ? (
            <label className="field field-realizado">
              <span>Realizado</span>
              <input
                type="text"
                inputMode="decimal"
                value={moneyInput(safeItem.valor_realizado, '0')}
                onChange={(e) => onUpdate?.('valor_realizado', e.target.value)}
                readOnly={readOnly}
              />
            </label>
          ) : null}
        </div>
      </div>

      {!readOnly ? (
        <button type="button" className="item-remove" onClick={() => onRemove?.()} aria-label="Remover item">
          ×
        </button>
      ) : null}

      <style jsx>{`
        .item-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid var(--line, #2f2f2f);
          border-radius: 12px;
          background: var(--surface, #1c1c1c);
          padding: 10px;
          transition: all 0.25s ease;
        }

        .item-row.is-realized {
          background: rgba(0, 200, 83, 0.05);
          border-color: rgba(0, 200, 83, 0.32);
        }

        .item-check {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #616161;
          background: transparent;
          color: transparent;
          font-weight: 700;
          line-height: 1;
          margin-top: 3px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .item-check.checked {
          border-color: #00c853;
          background: #00c853;
          color: #03250f;
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .item-name {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text, #f3f3f3);
          font-weight: 600;
          text-decoration: ${realized ? 'line-through' : 'none'};
        }

        .badge-acima {
          font-size: 11px;
          font-weight: 700;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.16);
          border: 1px solid rgba(245, 158, 11, 0.28);
          border-radius: 999px;
          padding: 2px 8px;
          white-space: nowrap;
        }

        .item-values {
          margin-top: 8px;
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(${realized ? 2 : 1}, minmax(0, 1fr));
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field span {
          color: var(--muted, #9ea29f);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .field input {
          border: 1px solid #383838;
          border-radius: 8px;
          background: #141414;
          color: ${realized ? '#00c853' : '#f3f3f3'};
          font-size: 13px;
          padding: 7px 8px;
        }

        .field-realizado input {
          border-color: rgba(0, 200, 83, 0.42);
          background: rgba(0, 200, 83, 0.08);
          color: #00c853;
        }

        .item-remove {
          border: 0;
          background: transparent;
          color: #9b9b9b;
          font-size: 22px;
          line-height: 1;
          padding: 0 2px;
          cursor: pointer;
          margin-top: -2px;
        }
      `}</style>
    </div>
  );
}
