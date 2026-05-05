'use client';

export default function MAVFTabs({ activeTab, onChange }) {
  return (
    <div className="mavf-tabs-wrap">
      <div className="mavf-tabs-bar">
        <button
          type="button"
          className={`mavf-tab ${activeTab === 'mapa' ? 'active' : ''}`}
          onClick={() => onChange('mapa')}
        >
          Meu Mapa
        </button>
        <button
          type="button"
          className={`mavf-tab ${activeTab === 'objetivos' ? 'active' : ''}`}
          onClick={() => onChange('objetivos')}
        >
          Objetivos
        </button>
      </div>
      <style jsx>{`
        .mavf-tabs-wrap {
          margin-bottom: 20px;
        }

        .mavf-tabs-bar {
          display: flex;
          background: #111;
          border: 1px solid #333;
          border-radius: 12px;
          overflow: hidden;
        }

        .mavf-tab {
          flex: 1;
          border: none;
          background: transparent;
          color: #888;
          padding: 13px 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .mavf-tab:hover {
          color: #bbb;
        }

        .mavf-tab.active {
          color: #00c853;
          background: rgba(0, 200, 83, 0.08);
          border-bottom-color: #00c853;
        }
      `}</style>
    </div>
  );
}
