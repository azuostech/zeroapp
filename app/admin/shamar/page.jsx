'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSequentialMetaTotal, getSequentialSquareCount } from '@/src/lib/shamar/board-generator';

const DEFAULT_FORM = {
  turma: '',
  meta_total: '125000',
  duration_days: '180',
  started_at: new Date().toISOString().slice(0, 10)
};

const DEFAULT_JOURNEY_FILTERS = {
  search: '',
  mode: '',
  status: ''
};

const STATUS_LABELS = {
  active: 'Ativa',
  completed: 'Concluída',
  abandoned: 'Abandonada'
};

const MODE_LABELS = {
  individual: 'Individual',
  dupla: 'Dupla',
  tribo: 'Tribo'
};

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

function datetimeLabel(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function journeyTitle(journey) {
  const user = journey?.user;
  return user?.full_name || user?.email || 'Usuário sem nome';
}

function shortMode(mode) {
  return MODE_LABELS[mode] || 'SHAMAR';
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
  const [journeys, setJourneys] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [journeyFilters, setJourneyFilters] = useState(DEFAULT_JOURNEY_FILTERS);
  const [editingJourneyId, setEditingJourneyId] = useState('');
  const [journeyForm, setJourneyForm] = useState({});
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journeysLoading, setJourneysLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingJourney, setSavingJourney] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState('');
  const [copyingInviteId, setCopyingInviteId] = useState('');
  const [triboInviteInputs, setTriboInviteInputs] = useState({});
  const [savingTriboAdminAction, setSavingTriboAdminAction] = useState('');
  const [message, setMessage] = useState('');

  const preview = useMemo(() => {
    const meta = Number(String(form.meta_total || '').replace(',', '.')) || 0;
    if (meta <= 0) return null;
    return {
      requested: meta,
      adjusted: getSequentialMetaTotal(meta),
      squares: getSequentialSquareCount(meta)
    };
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

  const loadJourneys = async (filters = journeyFilters) => {
    setJourneysLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.mode) params.set('mode', filters.mode);
      if (filters.status) params.set('status', filters.status);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const payload = await apiRequest(`/api/admin/shamar/journeys${suffix}`);
      setJourneys(payload?.journeys || []);
    } catch (error) {
      setMessage(error.message || 'Erro ao carregar jornadas SHAMAR');
    } finally {
      setJourneysLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    loadJourneys(DEFAULT_JOURNEY_FILTERS);
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

  const applyJourneyFilters = async (event) => {
    event.preventDefault();
    await loadJourneys(journeyFilters);
  };

  const startEditJourney = (journey) => {
    setEditingJourneyId(journey.id);
    setJourneyForm({
      turma: journey.config?.turma || '',
      status: journey.status || 'active',
      started_at: String(journey.config?.started_at || '').slice(0, 10),
      duration_days: String(journey.config?.duration_days || 180),
      is_active: Boolean(journey.config?.is_active),
      patrimonio_inicial: String(journey.season?.patrimonio_inicial ?? 0),
      patrimonio_final: journey.season?.patrimonio_final === null || journey.season?.patrimonio_final === undefined
        ? ''
        : String(journey.season.patrimonio_final)
    });
  };

  const cancelEditJourney = () => {
    setEditingJourneyId('');
    setJourneyForm({});
  };

  const updateJourneyForm = (field, value) => {
    setJourneyForm((current) => ({ ...current, [field]: value }));
  };

  const saveJourney = async (journey) => {
    setSavingJourney(true);
    setMessage('');
    try {
      await apiRequest('/api/admin/shamar/journeys', {
        method: 'PATCH',
        body: JSON.stringify({
          season_id: journey.id,
          turma: journeyForm.turma,
          status: journeyForm.status,
          started_at: journeyForm.started_at,
          duration_days: Number(journeyForm.duration_days),
          is_active: Boolean(journeyForm.is_active),
          patrimonio_inicial: Number(String(journeyForm.patrimonio_inicial || '0').replace(',', '.')),
          patrimonio_final: String(journeyForm.patrimonio_final || '').trim()
            ? Number(String(journeyForm.patrimonio_final).replace(',', '.'))
            : undefined
        })
      });
      setMessage('Jornada SHAMAR atualizada.');
      cancelEditJourney();
      await Promise.all([loadJourneys(), loadConfigs()]);
    } catch (error) {
      setMessage(error.message || 'Erro ao editar jornada');
    } finally {
      setSavingJourney(false);
    }
  };

  const deleteJourney = async (journey) => {
    const ok = window.confirm(`Excluir a jornada SHAMAR de ${journeyTitle(journey)}? Essa ação remove a temporada selecionada e cancela convites pendentes ligados a ela.`);
    if (!ok) return;

    setMessage('');
    try {
      await apiRequest('/api/admin/shamar/journeys', {
        method: 'DELETE',
        body: JSON.stringify({ season_id: journey.id })
      });
      setMessage('Jornada SHAMAR excluída.');
      await Promise.all([loadJourneys(), loadConfigs()]);
    } catch (error) {
      setMessage(error.message || 'Erro ao excluir jornada');
    }
  };

  const resendInvite = async (invite) => {
    setResendingInviteId(invite.id);
    setMessage('');
    try {
      await apiRequest('/api/admin/shamar/journeys', {
        method: 'POST',
        body: JSON.stringify({ action: 'resend_invite', invite_id: invite.id })
      });
      setMessage(`Email reenviado para ${invite.invited_email}.`);
      await loadJourneys();
    } catch (error) {
      setMessage(error.message || 'Erro ao reenviar email');
    } finally {
      setResendingInviteId('');
    }
  };

  const copyInviteLink = async (invite) => {
    setCopyingInviteId(invite.id);
    setMessage('');
    try {
      if (!invite.accept_url) throw new Error('Link indisponível para este convite.');
      await navigator.clipboard.writeText(invite.accept_url);
      setMessage('Link do convite copiado.');
    } catch (error) {
      setMessage(error.message || 'Erro ao copiar link');
    } finally {
      setCopyingInviteId('');
    }
  };

  const updateTriboInviteInput = (configId, value) => {
    setTriboInviteInputs((current) => ({ ...current, [configId]: value }));
  };

  const runTriboAdminAction = async ({ journey, method, body, successMessage, resetInviteInput = false }) => {
    const configId = journey.config?.id || journey.season?.tribo_config_id;
    if (!configId) {
      setMessage('Configuração da TRIBO não encontrada.');
      return;
    }

    setSavingTriboAdminAction(`${body?.action || method}:${configId}`);
    setMessage('');
    try {
      await apiRequest('/api/shamar/tribo', {
        method,
        body: JSON.stringify({
          tribo_config_id: configId,
          ...body
        })
      });
      if (resetInviteInput) updateTriboInviteInput(configId, '');
      setMessage(successMessage);
      await Promise.all([loadJourneys(), loadConfigs()]);
    } catch (error) {
      setMessage(error.message || 'Erro ao gerenciar TRIBO');
    } finally {
      setSavingTriboAdminAction('');
    }
  };

  const inviteTriboParticipants = (journey) => {
    const configId = journey.config?.id || journey.season?.tribo_config_id;
    const emails = triboInviteInputs[configId] || '';
    runTriboAdminAction({
      journey,
      method: 'POST',
      body: { action: 'invite', invite_emails: emails },
      successMessage: 'Convites enviados para a TRIBO.',
      resetInviteInput: true
    });
  };

  const removeTriboParticipant = (journey, participant) => {
    const ok = window.confirm(`Remover ${participant.name || participant.email || 'participante'} desta TRIBO? O histórico será preservado.`);
    if (!ok) return;
    runTriboAdminAction({
      journey,
      method: 'DELETE',
      body: { action: 'remove_participant', season_id: participant.season_id },
      successMessage: 'Participante removido da TRIBO.'
    });
  };

  const cancelTriboInvite = (journey, invite) => {
    runTriboAdminAction({
      journey,
      method: 'DELETE',
      body: { action: 'cancel_invite', invite_id: invite.id },
      successMessage: 'Convite da TRIBO cancelado.'
    });
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
              <strong>Meta sequencial ajustada</strong>
              <span>{preview ? money(preview.adjusted) : money(form.meta_total)}</span>
            </div>
            {preview ? (
              <div className="preview-sequence">
                <div>
                  <span>Meta digitada</span>
                  <strong>{money(preview.requested)}</strong>
                </div>
                <div>
                  <span>Quadrinhos</span>
                  <strong>{preview.squares}</strong>
                </div>
                <div>
                  <span>Regra</span>
                  <strong>posição = valor</strong>
                </div>
              </div>
            ) : null}
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

      <section className="panel journey-panel">
        <div className="panel-head">
          <div>
            <h2>Jornadas dos alunos</h2>
            <p>Edite, exclua e reenvie convites de um SHAMAR específico.</p>
          </div>
          <button type="button" onClick={() => loadJourneys()}>Atualizar</button>
        </div>

        <form className="journey-filters" onSubmit={applyJourneyFilters}>
          <label>
            Buscar
            <input
              value={journeyFilters.search}
              onChange={(event) => setJourneyFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Aluno, email, turma..."
            />
          </label>
          <label>
            Modalidade
            <select
              value={journeyFilters.mode}
              onChange={(event) => setJourneyFilters((current) => ({ ...current, mode: event.target.value }))}
            >
              <option value="">Todas</option>
              <option value="individual">Individual</option>
              <option value="dupla">Dupla</option>
              <option value="tribo">Tribo</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={journeyFilters.status}
              onChange={(event) => setJourneyFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">Todos</option>
              <option value="active">Ativa</option>
              <option value="completed">Concluída</option>
              <option value="abandoned">Abandonada</option>
            </select>
          </label>
          <button type="submit">Filtrar</button>
        </form>

        {journeysLoading ? <div className="empty">Carregando jornadas...</div> : null}
        {!journeysLoading && journeys.length === 0 ? <div className="empty">Nenhuma jornada encontrada.</div> : null}

        <div className="journey-list">
          {journeys.map((journey) => {
            const editing = editingJourneyId === journey.id;
            const pendingInvites = (journey.invites || []).filter((invite) => invite.status === 'pending');

            return (
              <article className="journey-card" key={journey.id}>
                <div className="journey-main">
                  <div>
                    <span className={`status ${journey.status === 'active' ? 'on' : 'off'}`}>
                      {STATUS_LABELS[journey.status] || journey.status}
                    </span>
                    <h3>{journeyTitle(journey)}</h3>
                    <p>{journey.user?.email || 'Email não encontrado'}</p>
                  </div>
                  <div className="journey-mode">
                    <strong>{shortMode(journey.mode)}</strong>
                    <span>{journey.config?.turma || 'Sem turma'}</span>
                  </div>
                </div>

                <div className="metrics">
                  <span>{money(journey.config?.meta_total || 0)} meta</span>
                  <span>{money(journey.stats?.contributions_total || 0)} aportado</span>
                  <span>{journey.stats?.squares_marked || 0} quadrinhos</span>
                  <span>Início {datetimeLabel(journey.season?.started_at)}</span>
                  <span>{journey.config?.is_active ? 'Config ativa' : 'Config encerrada'}</span>
                </div>

                {pendingInvites.length > 0 ? (
                  <div className="invite-admin-list">
                    {pendingInvites.map((invite) => (
                      <div className="invite-admin-row" key={invite.id}>
                        <div>
                          <strong>{invite.invited_email}</strong>
                          <span>{invite.email_sent ? 'Email enviado · aguardando aceite' : invite.email_error || 'Email pendente'}</span>
                        </div>
                        <div className="invite-admin-actions">
                          <button type="button" onClick={() => resendInvite(invite)} disabled={resendingInviteId === invite.id}>
                            {resendingInviteId === invite.id ? 'Enviando...' : 'Reenviar email'}
                          </button>
                          <button type="button" onClick={() => copyInviteLink(invite)} disabled={copyingInviteId === invite.id || !invite.accept_url}>
                            {copyingInviteId === invite.id ? 'Copiando...' : 'Copiar link'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {editing ? (
                  <div className="journey-edit">
                    <label>
                      Nome/turma
                      <input value={journeyForm.turma || ''} onChange={(event) => updateJourneyForm('turma', event.target.value)} />
                    </label>
                    <label>
                      Status
                      <select value={journeyForm.status || 'active'} onChange={(event) => updateJourneyForm('status', event.target.value)}>
                        <option value="active">Ativa</option>
                        <option value="completed">Concluída</option>
                        <option value="abandoned">Abandonada</option>
                      </select>
                    </label>
                    <label>
                      Início
                      <input type="date" value={journeyForm.started_at || ''} onChange={(event) => updateJourneyForm('started_at', event.target.value)} />
                    </label>
                    <label>
                      Duração
                      <select value={journeyForm.duration_days || '180'} onChange={(event) => updateJourneyForm('duration_days', event.target.value)}>
                        <option value="30">30 dias</option>
                        <option value="90">90 dias</option>
                        <option value="180">180 dias</option>
                        <option value="365">365 dias</option>
                      </select>
                    </label>
                    <label>
                      Patrimônio inicial
                      <input value={journeyForm.patrimonio_inicial || ''} onChange={(event) => updateJourneyForm('patrimonio_inicial', event.target.value)} inputMode="decimal" />
                    </label>
                    <label>
                      Patrimônio final
                      <input value={journeyForm.patrimonio_final || ''} onChange={(event) => updateJourneyForm('patrimonio_final', event.target.value)} inputMode="decimal" />
                    </label>
                    <label className="switch-row">
                      <input
                        type="checkbox"
                        checked={Boolean(journeyForm.is_active)}
                        onChange={(event) => updateJourneyForm('is_active', event.target.checked)}
                      />
                      Configuração ativa para esta jornada
                    </label>
                    <div className="journey-edit-actions">
                      <button type="button" className="success" onClick={() => saveJourney(journey)} disabled={savingJourney}>
                        {savingJourney ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button type="button" onClick={cancelEditJourney}>Cancelar</button>
                    </div>

                    {journey.mode === 'tribo' ? (
                      <div className="admin-tribo-manager">
                        <h4>Participantes da TRIBO</h4>
                        <div className="admin-tribo-invite">
                          <input
                            value={triboInviteInputs[journey.config?.id] || ''}
                            onChange={(event) => updateTriboInviteInput(journey.config?.id, event.target.value)}
                            placeholder="email1@exemplo.com, email2@exemplo.com"
                          />
                          <button
                            type="button"
                            onClick={() => inviteTriboParticipants(journey)}
                            disabled={Boolean(savingTriboAdminAction)}
                          >
                            Adicionar
                          </button>
                        </div>

                        <div className="admin-tribo-list">
                          {(journey.tribo?.participants || []).map((participant) => (
                            <div className="admin-tribo-row" key={participant.season_id}>
                              <div>
                                <strong>{participant.name}</strong>
                                <span>{participant.email || 'Email não encontrado'}{participant.is_creator ? ' · criador' : ''}</span>
                              </div>
                              {!participant.is_creator ? (
                                <button type="button" onClick={() => removeTriboParticipant(journey, participant)} disabled={Boolean(savingTriboAdminAction)}>
                                  Remover
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {(journey.tribo?.pending_invites || []).length > 0 ? (
                          <div className="admin-tribo-list">
                            <h4>Convites pendentes</h4>
                            {(journey.tribo?.pending_invites || []).map((invite) => (
                              <div className="admin-tribo-row" key={invite.id}>
                                <div>
                                  <strong>{invite.invited_email}</strong>
                                  <span>{invite.email_sent ? 'Email enviado' : invite.email_error || 'Email pendente'}</span>
                                </div>
                                <div className="admin-tribo-row-actions">
                                  <button type="button" onClick={() => resendInvite(invite)} disabled={resendingInviteId === invite.id}>
                                    Reenviar
                                  </button>
                                  <button type="button" onClick={() => copyInviteLink(invite)} disabled={copyingInviteId === invite.id || !invite.accept_url}>
                                    {copyingInviteId === invite.id ? 'Copiando...' : 'Copiar link'}
                                  </button>
                                  <button type="button" onClick={() => cancelTriboInvite(journey, invite)} disabled={Boolean(savingTriboAdminAction)}>
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="actions">
                  <button type="button" onClick={() => startEditJourney(journey)}>Editar</button>
                  <button type="button" className="danger" onClick={() => deleteJourney(journey)}>Excluir</button>
                </div>
              </article>
            );
          })}
        </div>
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
        .config-list,
        .journey-list,
        .invite-admin-list {
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

        .journey-panel {
          margin-top: 16px;
        }

        .journey-filters {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 160px 150px auto;
          gap: 10px;
          align-items: end;
          margin: 14px 0;
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
        .panel-head,
        .actions,
        .metrics {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .preview-sequence {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .preview-sequence div {
          border-radius: 10px;
          background: var(--bg3);
          padding: 10px;
        }

        .preview-sequence span {
          display: block;
          color: var(--text-2);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .preview-sequence strong {
          display: block;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
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

        .config-card,
        .journey-card {
          border: 1px solid var(--border-2);
          border-radius: 12px;
          padding: 13px;
          background: var(--bg-surface);
          display: grid;
          gap: 12px;
        }

        .journey-main {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: start;
        }

        .journey-main h3 {
          margin-top: 6px;
        }

        .journey-mode {
          min-width: 160px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-card);
          padding: 10px;
          text-align: right;
        }

        .journey-mode strong,
        .journey-mode span {
          display: block;
        }

        .journey-mode strong {
          color: var(--green-dark);
          font-weight: 900;
        }

        .journey-mode span {
          color: var(--text-2);
          font-size: 11px;
          margin-top: 3px;
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

        .invite-admin-list {
          border-top: 1px solid var(--border);
          padding-top: 10px;
        }

        .invite-admin-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-card);
          padding: 10px;
        }

        .invite-admin-row strong,
        .invite-admin-row span {
          display: block;
        }

        .invite-admin-row strong {
          font-size: 13px;
          font-weight: 900;
        }

        .invite-admin-row span {
          color: var(--text-2);
          font-size: 11px;
          margin-top: 3px;
        }

        .invite-admin-actions,
        .journey-edit-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .journey-edit {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          border: 1px solid var(--border-green);
          border-radius: 12px;
          background: var(--green-dim);
          padding: 12px;
        }

        .switch-row {
          grid-column: span 2;
          grid-template-columns: auto 1fr;
          align-items: center;
          color: var(--text);
        }

        .switch-row input {
          width: auto;
        }

        .journey-edit-actions {
          justify-content: flex-start;
          align-self: end;
        }

        .admin-tribo-manager {
          grid-column: 1 / -1;
          border-top: 1px solid var(--border-green);
          padding-top: 12px;
          display: grid;
          gap: 10px;
        }

        .admin-tribo-manager h4 {
          margin: 0;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .admin-tribo-invite {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .admin-tribo-list {
          display: grid;
          gap: 8px;
        }

        .admin-tribo-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-card);
          padding: 10px;
        }

        .admin-tribo-row strong,
        .admin-tribo-row span {
          display: block;
        }

        .admin-tribo-row strong {
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .admin-tribo-row span {
          color: var(--text-2);
          font-size: 11px;
          margin-top: 3px;
        }

        .admin-tribo-row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
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

          .journey-filters,
          .journey-main,
          .invite-admin-row,
          .journey-edit,
          .admin-tribo-invite,
          .admin-tribo-row {
            grid-template-columns: 1fr;
          }

          .journey-mode {
            text-align: left;
          }

          .admin-top {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
