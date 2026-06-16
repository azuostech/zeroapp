'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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

function dueDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function AdminShamarMissionsPage() {
  const params = useParams();
  const triboConfigId = params?.triboConfigId;
  const [config, setConfig] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadMissions = async () => {
    if (!triboConfigId) return;
    setLoading(true);
    setMessage('');
    try {
      const payload = await apiRequest(`/api/admin/shamar/missions/${encodeURIComponent(triboConfigId)}`);
      setConfig(payload?.config || null);
      setMissions(payload?.missions || []);
    } catch (error) {
      setMessage(error.message || 'Erro ao carregar missões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, [triboConfigId]);

  const patchMission = async (mission, changes = {}) => {
    setSavingId(mission.mission_id);
    setMessage('');
    const next = { ...mission, ...changes };

    try {
      const payload = await apiRequest(`/api/admin/shamar/missions/${encodeURIComponent(triboConfigId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          mission_id: mission.mission_id,
          is_active: Boolean(next.is_active),
          due_date: dueDateInput(next.due_date) || null,
          custom_points: next.custom_points === '' ? null : next.custom_points
        })
      });
      setConfig(payload?.config || config);
      setMissions(payload?.missions || missions);
      setMessage('Missão atualizada.');
    } catch (error) {
      setMessage(error.message || 'Erro ao salvar missão');
    } finally {
      setSavingId(null);
    }
  };

  const updateLocal = (missionId, changes) => {
    setMissions((current) => current.map((mission) => (mission.mission_id === missionId ? { ...mission, ...changes } : mission)));
  };

  return (
    <div className="missions-admin">
      <header className="top">
        <div>
          <Link href="/admin/shamar" className="back">← SHAMAR Admin</Link>
          <h1>Missões da turma</h1>
          <p>{config?.turma || 'Configuração SHAMAR'}</p>
        </div>
        <button type="button" onClick={loadMissions}>Atualizar</button>
      </header>

      {message ? <div className="message">{message}</div> : null}
      {loading ? <div className="panel empty">Carregando missões...</div> : null}

      {!loading ? (
        <section className="panel">
          <div className="table">
            <div className="thead">
              <span>Missão</span>
              <span>Pontos</span>
              <span>Prazo</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {missions.map((mission) => (
              <article className="row" key={mission.mission_id}>
                <div>
                  <strong>{mission.title}</strong>
                  <p>{mission.description}</p>
                  <small>{mission.mission_type} · {mission.recurrence}</small>
                </div>
                <input
                  type="number"
                  min="0"
                  value={mission.custom_points ?? ''}
                  placeholder={String(mission.default_points)}
                  onChange={(event) => updateLocal(mission.mission_id, { custom_points: event.target.value })}
                />
                <input
                  type="date"
                  value={dueDateInput(mission.due_date)}
                  onChange={(event) => updateLocal(mission.mission_id, { due_date: event.target.value })}
                />
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(mission.is_active)}
                    onChange={(event) => patchMission(mission, { is_active: event.target.checked })}
                  />
                  <span>{mission.is_active ? 'Ativa' : 'Inativa'}</span>
                </label>
                <button type="button" disabled={savingId === mission.mission_id} onClick={() => patchMission(mission)}>
                  {savingId === mission.mission_id ? 'Salvando...' : 'Salvar'}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <style jsx>{`
        .missions-admin {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 28px;
          font-family: var(--font-body);
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .back {
          color: var(--green);
          text-decoration: none;
          font-weight: 800;
        }

        h1,
        p {
          margin: 0;
        }

        h1 {
          margin-top: 8px;
          font-family: var(--font-display);
          font-size: 30px;
        }

        .top p,
        .row p,
        .row small {
          color: var(--muted);
        }

        .message,
        .panel {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg-card);
          box-shadow: var(--shadow-card);
        }

        .message {
          padding: 10px 12px;
          margin-bottom: 14px;
          color: var(--green-dark);
          background: var(--green-dim);
          border-color: var(--border-green);
          font-weight: 800;
        }

        .panel {
          overflow: hidden;
        }

        .empty {
          padding: 22px;
          color: var(--muted);
        }

        .table {
          display: grid;
        }

        .thead,
        .row {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) 120px 150px 120px 110px;
          gap: 12px;
          align-items: center;
          padding: 13px 16px;
        }

        .thead {
          background: var(--bg3);
          color: var(--muted);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .row {
          border-top: 1px solid var(--border);
        }

        .row strong {
          display: block;
          margin-bottom: 4px;
        }

        .row p {
          font-size: 12px;
          line-height: 1.45;
        }

        input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-surface);
          color: var(--text);
          padding: 9px 10px;
          font: inherit;
        }

        button {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--green);
          color: #03140b;
          padding: 9px 11px;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-2);
          font-weight: 800;
          font-size: 12px;
        }

        .toggle input {
          width: 18px;
          height: 18px;
          accent-color: var(--green);
        }

        @media (max-width: 900px) {
          .missions-admin {
            padding: 18px 12px;
          }

          .thead {
            display: none;
          }

          .row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
