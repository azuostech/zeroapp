'use client';

export default function ProgressSlider({ value, onChange, onSave, onCancel, saving = false }) {
  return (
    <div className="progress-slider-wrap">
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
        className="progress-slider"
      />

      <div className="progress-slider-labels">
        <span>0%</span>
        <span>{value}%</span>
        <span>100%</span>
      </div>

      <div className="slider-actions">
        <button type="button" className="slider-btn slider-btn-cancel" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="slider-btn slider-btn-save" onClick={() => onSave(value)} disabled={saving}>
          {saving ? 'Salvando...' : `Salvar ${value}%`}
        </button>
      </div>

      <style jsx>{`
        .progress-slider-wrap {
          margin-top: 10px;
        }

        .progress-slider {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: var(--border);
          -webkit-appearance: none;
          appearance: none;
          outline: none;
        }

        .progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--green);
          cursor: pointer;
          box-shadow: 0 2px 8px color-mix(in srgb, var(--green) 40%, transparent);
        }

        .progress-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 50%;
          background: var(--green);
          cursor: pointer;
        }

        .progress-slider-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
          color: var(--muted-dark);
          font-size: 10px;
        }

        .slider-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .slider-btn {
          flex: 1;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .slider-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .slider-btn-cancel {
          background: transparent;
          color: var(--text-2);
          border: 1px solid var(--border);
        }

        .slider-btn-cancel:hover:not(:disabled) {
          border-color: var(--border-2);
          color: var(--text);
        }

        .slider-btn-save {
          background: var(--green);
          color: var(--bg);
          border: 1px solid var(--green);
        }

        .slider-btn-save:hover:not(:disabled) {
          filter: brightness(0.95);
        }
      `}</style>
    </div>
  );
}
