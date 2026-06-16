'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_FORM = {
  turma: '',
  meta_total: '125000',
  duration_days: '180',
  started_at: new Date().toISOString().slice(0, 10)
};

const CATEGORIES = [
  { id: 'pequeno', label: 'Pequenos', pct: 40, color: '#1B5E20' },
  { id: 'medio', label: 'Médios', pct: 40, color: '#4488ff' },
  { id: 'grande', label: 'Grandes', pct: 15, color: '#FFD700' },
  { id: 'epico', label: 'Épicos', pct: 5, color: '#9C27B0' }
];

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
}

function dateLabel(value) {
  if (!value) return '—';
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR');
}

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

export default function AdminShamarPage() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const preview = useMemo(() => {
    const meta = Number(String(form.meta_total || '').replace(',', '.')) || 0;
    return CATEGORIES.map((category) => ({
      ...category,
      value: Math.round(meta * (category.pct / 100))
    }));
  }, [form.meta_total]);

  const loadConfigs = async () => {
    setLoading(true);
    setMessage('');
    try {
      const payload = await apiRequest('/api/admin/shamar/configs');
      setConfigs(payload?.configs || []);
    } catch (error) {
      setMessage(error.message || 'Erro ao carregar SHAMAR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const createConfig = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = await apiRequest('/api/admin/shamar/configs', {
        method: 'POST',
        body: JSON.stringify({
          turma: form.turma,
          meta_total: Number(String(form.meta_total).replace(',', '.')),
          duration_days: Number(form.duration_days),
          started_at: form.started_at
        })
      });
      setConfigs((current) => [payload.config, ...current]);
      setForm(DEFAULT_FORM);
      setMessage('Temporada criada com tabuleiro gerado.');
    } catch (error) {
      setMessage(error.message || 'Erro ao criar temporada');
    } finally {
      setSaving(false);
    }
  };

  const toggleConfig = async (config) => {
    const nextActive = !config.is_active;
    const ok = window.confirm(nextActive ? 'Reativar esta temporada SHAMAR?' : 'Encerrar esta temporada para novas entradas?');
    if (!ok) return;

    setMessage('');
    try {
      const payload = await apiRequest('/api/admin/shamar/configs', {
        method: 'PATCH',
        body: JSON.stringify({ id: config.id, is_active: nextActive })
      });
      setConfigs((current) => current.map((item) => (item.id === config.id ? { ...item, ...payload.config } : item)));
      setMessage(nextActive ? 'Temporada reativada.' : 'Temporada encerrada para novas entradas.');
    } catch (error) {
      setMessage(error.message || 'Erro ao atualizar temporada');
    }
  };

  const loadBoard = async (config) => {
    setMessage('');
    try {
      const payload = await apiRequest(`/api/admin/shamar/board?tribo_config_id=${encodeURIComponent(config.id)}`);
      setSelectedBoard({
        config,
        squares: payload?.squares || [],
        stats: payload?.stats || null
      });
    } catch (error) {
      setMessage(error.message || 'Erro ao carregar tabuleiro');
    }
  };

  return (
    <div className="admin-shamar">
      <header className="admin-top">
        <div>
          <Link href="/admin" className="back-link">← Admin</Link>
          <h1>SHAMAR Admin</h1>
          <p>Temporadas, tabuleiros e missões por turma.</p>
        </div>
        <Link href="/admin/shamar/comprovantes" className="proof-link">Comprovantes</Link>
      </header>

      {message ? <div className="message">{message}</div> : null}

      <section className="admin-grid">
        <form className="panel form-panel" onSubmit={createConfig}>
          <h2>Nova temporada</h2>
          <label>
            Turma
            <input value={form.turma} onChange={(event) => updateForm('turma', event.target.value)} placeholder="Maio 2026" required />
          </label>
          <label>
            Meta total
            <input
              value={form.meta_total}
              onChange={(event) => updateForm('meta_total', event.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <div className="field-row">
            <label>
              Duração
              <select value={form.duration_days} onChange={(event) => updateForm('duration_days', event.target.value)}>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="180">180 dias</option>
                <option value="365">365 dias</option>
              </select>
            </label>
            <label>
              Início
              <input type="date" value={form.started_at} onChange={(event) => updateForm('started_at', event.target.value)} required />
            </label>
          </div>

          <div className="preview">
            <div className="preview-head">
              <strong>Prévia da distribuição</strong>
              <span>{money(form.meta_total)}</span>
            </div>
            {preview.map((category) => (
              <div className="preview-row" key={category.id}>
                <span style={{ '--dot': category.color }}>{category.label}</span>
                <div className="preview-track">
                  <i style={{ width: `${category.pct}%`, background: category.color }} />
                </div>
                <strong>{money(category.value)}</strong>
              </div>
            ))}
          </div>

          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Criando...' : 'Criar temporada'}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="panel-head">
            <h2>Temporadas</h2>
            <button type="button" onClick={loadConfigs}>Atualizar</button>
          </div>

          {loading ? <div className="empty">Carregando...</div> : null}
          {!loading && configs.length === 0 ? <div className="empty">Nenhuma temporada SHAMAR cadastrada.</div> : null}

          <div className="config-list">
            {configs.map((config) => (
              <article className="config-card" key={config.id}>
                <div className="config-main">
                  <span className={`status ${config.is_active ? 'on' : 'off'}`}>{config.is_active ? 'Ativa' : 'Encerrada'}</span>
                  <h3>{config.turma}</h3>
                  <p>{dateLabel(config.started_at)} até {dateLabel(config.ends_at)}</p>
                  <div className="metrics">
                    <span>{money(config.meta_total)} meta</span>
                    <span>{config.board_stats?.total || 0} quadrinhos</span>
                    <span>{config.seasons_stats?.active || 0} ativas</span>
                    <span>{config.seasons_stats?.completed || 0} concluídas</span>
                  </div>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => loadBoard(config)}>Ver tabuleiro</button>
                  <Link href={`/admin/shamar/missoes/${config.id}`}>Missões</Link>
                  <button type="button" className={config.is_active ? 'danger' : 'success'} onClick={() => toggleConfig(config)}>
                    {config.is_active ? 'Encerrar' : 'Reativar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      {selectedBoard ? (
        <section className="panel board-panel">
          <div className="panel-head">
            <div>
              <h2>Tabuleiro · {selectedBoard.config.turma}</h2>
              <p>{selectedBoard.stats?.total || 0} quadrinhos · {money(selectedBoard.stats?.sum || 0)}</p>
            </div>
            <button type="button" onClick={() => setSelectedBoard(null)}>Fechar</button>
          </div>
          <div className="board-grid">
            {selectedBoard.squares.map((square) => (
              <span key={square.id} className={`square ${square.category}`} title={`${square.position} · ${money(square.value)}`} />
            ))}
          </div>
        </section>
      ) : null}

      <style jsx>{`
        .admin-shamar {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 28px;
          font-family: var(--font-body);
        }

        .admin-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .back-link,
        .proof-link,
        .actions a {
          color: var(--green);
          text-decoration: none;
          font-weight: 800;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 8px;
          font-size: 30px;
          font-family: var(--font-display);
        }

        .admin-top p,
        .panel-head p,
        .config-card p {
          color: var(--muted);
          margin-top: 5px;
        }

        .message {
          border: 1px solid var(--border-green);
          background: var(--green-dim);
          color: var(--green-dark);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 14px;
          font-weight: 700;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: minmax(300px, 380px) 1fr;
          gap: 16px;
          align-items: start;
        }

        .panel {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg-card);
          padding: 16px;
          box-shadow: var(--shadow-card);
        }

        .form-panel,
        .config-list {
          display: grid;
          gap: 12px;
        }

        label {
          display: grid;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          color: var(--text-2);
        }

        input,
        select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 10px 11px;
          font: inherit;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .preview {
          border: 1px solid var(--border-2);
          border-radius: 12px;
          padding: 12px;
          background: var(--bg-surface);
          display: grid;
          gap: 9px;
        }

        .preview-head,
        .preview-row,
        .panel-head,
        .actions,
        .metrics {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .preview-row span {
          min-width: 78px;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
        }

        .preview-row span::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dot);
          margin-right: 6px;
        }

        .preview-track {
          flex: 1;
          min-width: 90px;
          height: 7px;
          border-radius: 999px;
          background: var(--bg3);
          overflow: hidden;
        }

        .preview-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
        }

        button,
        .primary-btn,
        .actions a {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 8px 11px;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
        }

        .primary-btn {
          background: var(--green);
          color: #03140b;
          border-color: var(--green);
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .config-card {
          border: 1px solid var(--border-2);
          border-radius: 12px;
          padding: 13px;
          background: var(--bg-surface);
          display: grid;
          gap: 12px;
        }

        .status {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .status.on {
          color: var(--green-dark);
          background: var(--green-dim);
        }

        .status.off {
          color: var(--muted);
          background: var(--bg3);
        }

        .metrics {
          justify-content: flex-start;
          margin-top: 10px;
        }

        .metrics span {
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          color: var(--text-2);
        }

        .actions {
          justify-content: flex-start;
        }

        .actions .danger {
          border-color: color-mix(in srgb, var(--red) 35%, transparent);
          color: var(--red);
        }

        .actions .success {
          border-color: var(--border-green);
          color: var(--green-dark);
        }

        .empty {
          color: var(--muted);
          padding: 18px 0;
        }

        .board-panel {
          margin-top: 16px;
        }

        .board-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(18px, 1fr));
          gap: 5px;
        }

        .square {
          aspect-ratio: 1;
          border-radius: 4px;
          background: var(--green-dim);
          border: 1px solid var(--border-green);
        }

        .square.medio {
          background: rgba(68, 136, 255, 0.15);
          border-color: rgba(68, 136, 255, 0.35);
        }

        .square.grande {
          background: rgba(255, 215, 0, 0.18);
          border-color: rgba(255, 215, 0, 0.4);
        }

        .square.epico {
          background: rgba(156, 39, 176, 0.18);
          border-color: rgba(156, 39, 176, 0.4);
        }

        @media (max-width: 900px) {
          .admin-shamar {
            padding: 18px 12px;
          }

          .admin-grid {
            grid-template-columns: 1fr;
          }

          .admin-top {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
