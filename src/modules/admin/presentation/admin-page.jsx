'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/src/lib/supabase/browser';

const THEME_KEY = 'zeroapp-theme';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsEsc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

async function apiRequest(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(payload?.error || 'Erro na requisição');
  }

  return payload;
}

export default function AdminPage() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    let nextTheme = 'dark';
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') nextTheme = saved;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) nextTheme = 'light';
    } catch (_) {
      // no-op
    }
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      // no-op
    }
  }, [theme]);

  useEffect(() => {
    let allUsers = [];
    let modalUserFinData = [];

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const fmtDate = (iso) => {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const badgeHtml = (status) => {
      const labels = { pending: 'Aguardando', active: 'Ativo', disabled: 'Desativado' };
      return `<span class="badge ${status}"><span class="badge-dot"></span>${labels[status] || status}</span>`;
    };

    const showToast = (msg, type = '') => {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.className = `toast ${type} show`;
      setTimeout(() => {
        t.className = 'toast';
      }, 3000);
    };

    const buildTable = (users) => {
      return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map((u) => {
                const safeId = jsEsc(u.id);
                const safeEmail = jsEsc(u.email);
                const safeName = jsEsc(u.full_name || u.email);

                return `
                <tr>
                  <td>
                    <div class="user-name">${esc(u.full_name || 'Sem nome')}</div>
                    <div class="user-email">${esc(u.email)}</div>
                  </td>
                  <td><div class="user-phone">${esc(u.phone || '—')}</div></td>
                  <td>${badgeHtml(u.status)}</td>
                  <td style="font-size:11px;color:var(--dim)">${fmtDate(u.created_at)}</td>
                  <td>
                    <div class="actions">
                      ${u.status === 'pending' ? `<button class="btn-action btn-approve" onclick="setStatus('${safeId}','active')">✓ Aprovar</button>` : ''}
                      ${u.status === 'active' ? `<button class="btn-action btn-disable" onclick="setStatus('${safeId}','disabled')">✗ Desativar</button>` : ''}
                      ${u.status === 'disabled' ? `<button class="btn-action btn-enable" onclick="setStatus('${safeId}','active')">↺ Reativar</button>` : ''}
                      <button class="btn-action btn-reset" onclick="resetPassword('${safeEmail}')">🔑 Senha</button>
                      <button class="btn-action btn-view" onclick="openFinModal('${safeId}','${safeName}')">📊 Dados</button>
                    </div>
                  </td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>`;
    };

    const updateStats = () => {
      const total = allUsers.filter((u) => u.role !== 'admin').length;
      const active = allUsers.filter((u) => u.status === 'active').length;
      const pending = allUsers.filter((u) => u.status === 'pending').length;
      const disabled = allUsers.filter((u) => u.status === 'disabled').length;

      setText('stat-total', total);
      setText('stat-active', active);
      setText('stat-pending', pending);
      setText('stat-disabled', disabled);

      const pc = document.getElementById('pending-count');
      if (!pc) return;
      if (pending > 0) {
        pc.textContent = pending;
        pc.style.display = '';
      } else {
        pc.style.display = 'none';
      }
    };

    const updateMavfBadge = async () => {
      const badge = document.getElementById('mavf-active-count');
      if (!badge) return;
      try {
        const payload = await apiRequest('/api/mavf/sessions');
        const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
        const activeSessions = sessions.filter((session) => session?.status === 'active').length;

        if (activeSessions > 0) {
          badge.textContent = String(activeSessions);
          badge.style.display = '';
          return;
        }
      } catch (_) {
        // no-op
      }
      badge.style.display = 'none';
    };

    const renderPending = () => {
      const users = allUsers.filter((u) => u.status === 'pending');
      const el = document.getElementById('table-pending');
      if (!el) return;

      if (!users.length) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div>Nenhum usuário aguardando aprovação</div>';
        return;
      }

      el.innerHTML = buildTable(users);
    };

    const renderUsers = (filtered) => {
      const users = filtered ?? allUsers.filter((u) => u.role !== 'admin');
      const el = document.getElementById('table-users');
      if (!el) return;

      if (!users.length) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div>Nenhum usuário encontrado</div>';
        return;
      }

      el.innerHTML = buildTable(users);
    };

    const filterUsers = () => {
      const q = document.getElementById('search-input')?.value.toLowerCase() || '';
      const filtered = allUsers.filter(
        (u) =>
          u.role !== 'admin' &&
          ((u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      );
      renderUsers(filtered);
    };

    const loadAll = async () => {
      try {
        const payload = await apiRequest('/api/admin/users');
        allUsers = payload?.users || [];
        updateStats();
        renderPending();
        renderUsers();
      } catch (error) {
        showToast(error.message || 'Erro ao carregar', 'red');
      }
    };

    const setStatus = async (userId, status) => {
      try {
        await apiRequest(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        const labels = { active: 'Usuário aprovado', disabled: 'Usuário desativado', pending: 'Usuário pendente' };
        showToast(labels[status] || 'Atualizado', 'green');
        await loadAll();
      } catch (_) {
        showToast('Erro ao atualizar', 'red');
      }
    };

    const resetPassword = async (email) => {
      if (!window.confirm(`Enviar link de redefinição de senha para ${email}?`)) return;
      try {
        await apiRequest('/api/admin/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        showToast('E-mail de redefinição enviado!', 'green');
      } catch (_) {
        showToast('Erro ao enviar e-mail', 'red');
      }
    };

    const buildFinView = (d) => {
      if (!d || Object.keys(d).length === 0) return '<div class="fin-empty">Sem dados neste mês.</div>';

      const pmVal = (str) => {
        if (!str) return 0;
        return parseFloat(str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
      };

      const frVal = (n) =>
        'R$ ' +
        n.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

      const sections = [
        { key: 'receitas', label: '💰 Receitas', tipo: 'simples' },
        { key: 'pagar-primeiro', label: '⭐ Se Pagar Primeiro', tipo: 'simples' },
        { key: 'doar', label: '🤲 Doar', tipo: 'simples' },
        { key: 'contas', label: '📋 Pagar as Contas', tipo: 'grupos' },
        { key: 'investimentos', label: '📈 Investimentos', tipo: 'simples' },
        { key: 'desfrute', label: '🌟 Desfrute', tipo: 'simples' }
      ];

      const SAIDA = ['pagar-primeiro', 'doar', 'contas', 'investimentos', 'desfrute'];
      let html = '';
      let totalReceitas = 0;
      let totalSaidas = 0;

      sections.forEach(({ key, label, tipo }) => {
        const items = d[key];
        if (!items || items.length === 0) return;

        let sectionTotal = 0;
        let rows = '';

        if (tipo === 'simples') {
          items.forEach((c) => {
            const v = pmVal(c.valor);
            if (v === 0) return;
            sectionTotal += v;
            rows += `<div class="fin-row"><span class="fin-row-name">${esc(c.nome)}</span><span class="fin-row-val">${frVal(v)}</span></div>`;
          });
        } else {
          items.forEach((g) => {
            const gt = (g.subcats || []).reduce((a, s) => a + pmVal(s.valor), 0);
            if (gt === 0) return;
            sectionTotal += gt;
            rows += `<div class="fin-group-name">${esc(g.nome)}</div>`;
            (g.subcats || []).forEach((s) => {
              const v = pmVal(s.valor);
              if (v === 0) return;
              rows += `<div class="fin-subrow"><span class="fin-subrow-name">${esc(s.nome)}</span><span class="fin-subrow-val">${frVal(v)}</span></div>`;
            });
          });
        }

        if (sectionTotal === 0) return;
        if (key === 'receitas') totalReceitas += sectionTotal;
        else if (SAIDA.includes(key)) totalSaidas += sectionTotal;

        html += `
          <div class="fin-section">
            <div class="fin-section-title">${label}</div>
            ${rows}
            <div class="fin-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:8px">
              <span class="fin-row-name" style="color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:1px">Subtotal</span>
              <span class="fin-row-val" style="font-size:13px">${frVal(sectionTotal)}</span>
            </div>
          </div>`;
      });

      const saldo = totalReceitas - totalSaidas;
      html += `
        <div class="fin-total">
          <span class="fin-total-label">Saldo do Mês</span>
          <span class="fin-total-val ${saldo >= 0 ? 'pos' : 'neg'}">${frVal(saldo)}</span>
        </div>`;

      return html || '<div class="fin-empty">Nenhum valor preenchido neste mês.</div>';
    };

    const showFinMonth = (idx, btn) => {
      document.querySelectorAll('.month-btn').forEach((b) => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      else document.querySelectorAll('.month-btn')[idx]?.classList.add('active');

      const record = modalUserFinData[idx];
      if (!record) return;
      const d = record.data;
      const content = document.getElementById('fin-content');
      if (content) content.innerHTML = buildFinView(d);
    };

    const openFinModal = async (userId, userName) => {
      const title = document.getElementById('modal-title');
      const content = document.getElementById('fin-content');
      const overlay = document.getElementById('modal-overlay');

      if (title) title.textContent = `📊 ${userName}`;
      if (content) content.innerHTML = '<div class="loading"><div class="spinner"></div><br>Carregando dados...</div>';
      overlay?.classList.add('open');

      try {
        const payload = await apiRequest(`/api/admin/users/${userId}/financial`);
        modalUserFinData = payload?.data || [];

        if (!modalUserFinData.length) {
          const months = document.getElementById('fin-months');
          if (months) months.innerHTML = '';
          if (content) content.innerHTML = '<div class="fin-empty">Nenhum dado financeiro registrado ainda.</div>';
          return;
        }

        const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthsEl = document.getElementById('fin-months');
        if (monthsEl) {
          monthsEl.innerHTML = modalUserFinData
            .map(
              (r, i) =>
                `<button class="month-btn${i === 0 ? ' active' : ''}" onclick="showFinMonth(${i},this)">${MONTHS[parseInt(r.month, 10)]} ${r.year}</button>`
            )
            .join('');
        }

        showFinMonth(0, null);
      } catch (_) {
        showToast('Erro ao carregar dados financeiros', 'red');
      }
    };

    const closeModal = (event) => {
      const overlay = document.getElementById('modal-overlay');
      if (event && event.target !== overlay) return;
      overlay?.classList.remove('open');
    };

    const showView = (view) => {
      document.querySelectorAll('.view-content').forEach((el) => el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
      document.getElementById(`view-${view}`)?.classList.add('active');
      document.getElementById(`nav-${view}`)?.classList.add('active');
    };

    const logout = async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (_) {
        // no-op
      }
      try {
        const sb = getBrowserSupabase();
        await sb.auth.signOut();
      } catch (_) {
        // no-op
      }
      window.location.href = '/';
    };

    const init = async () => {
      try {
        const payload = await apiRequest('/api/profile/me');
        if (!payload?.profile || payload.profile.role !== 'admin') {
          window.location.href = '/app';
          return;
        }
        await loadAll();
        await updateMavfBadge();
      } catch (_) {
        window.location.href = '/';
      }
    };

    window.showView = showView;
    window.filterUsers = filterUsers;
    window.setStatus = setStatus;
    window.resetPassword = resetPassword;
    window.openFinModal = openFinModal;
    window.showFinMonth = showFinMonth;
    window.closeModal = closeModal;
    window.logout = logout;

    init();

    return () => {
      delete window.showView;
      delete window.filterUsers;
      delete window.setStatus;
      delete window.resetPassword;
      delete window.openFinModal;
      delete window.showFinMonth;
      delete window.closeModal;
      delete window.logout;
    };
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="admin-badge">★ Admin</div>
          <div className="header-title">Painel de Administração</div>
        </div>
        <div className="header-right">
          <div className="theme-switch">
            <button type="button" className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
              Claro
            </button>
            <button type="button" className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
              Escuro
            </button>
          </div>
          <button className="btn-logout" onClick={() => window.logout?.()}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout">
        <nav className="sidebar">
          <div className="nav-item active" onClick={() => window.showView?.('pending')} id="nav-pending">
            <span className="nav-icon">⏳</span> Aguardando
            <span
              id="pending-count"
              style={{
                marginLeft: 'auto',
                background: 'rgba(255,215,0,0.15)',
                color: 'var(--gold)',
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 700
              }}
            />
          </div>
          <div className="nav-item" onClick={() => window.showView?.('users')} id="nav-users">
            <span className="nav-icon">👥</span> Usuários
          </div>
          <a className="nav-item nav-item-link" href="/admin/mavf" id="nav-mavf">
            <span className="nav-icon">📊</span> MAVF — Sessões
            <span className="nav-badge" id="mavf-active-count" />
          </a>
          <div className="nav-sep" />
          <div className="nav-item" onClick={() => window.showView?.('stats')} id="nav-stats">
            <span className="nav-icon">📊</span> Visão geral
          </div>
        </nav>

        <main className="main">
          <div className="stats-bar" id="stats-bar">
            <div className="stat-card">
              <div className="stat-label">Total de usuários</div>
              <div className="stat-value blue" id="stat-total">
                —
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Ativos</div>
              <div className="stat-value green" id="stat-active">
                —
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Aguardando</div>
              <div className="stat-value gold" id="stat-pending">
                —
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Desativados</div>
              <div className="stat-value red" id="stat-disabled">
                —
              </div>
            </div>
          </div>

          <div className="view-content active" id="view-pending">
            <div className="section-header">
              <div className="section-title">Aguardando aprovação</div>
            </div>
            <div id="table-pending">
              <div className="loading">
                <div className="spinner" />
                <br />
                Carregando...
              </div>
            </div>
          </div>

          <div className="view-content" id="view-users">
            <div className="section-header">
              <div className="section-title">Todos os usuários</div>
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Buscar nome ou e-mail..."
                id="search-input"
                onInput={() => window.filterUsers?.()}
              />
            </div>
            <div id="table-users">
              <div className="loading">
                <div className="spinner" />
                <br />
                Carregando...
              </div>
            </div>
          </div>

          <div className="view-content" id="view-stats">
            <div className="section-title" style={{ marginBottom: '20px' }}>
              Visão geral
            </div>
            <div style={{ color: 'var(--dim)', fontSize: '14px' }}>Em breve — métricas gerais da plataforma.</div>
          </div>
        </main>
      </div>

      <div className="modal-overlay" id="modal-overlay" onClick={(event) => window.closeModal?.(event)}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title" id="modal-title">
              Dados financeiros
            </div>
            <button className="modal-close" onClick={() => window.closeModal?.()}>
              ✕
            </button>
          </div>
          <div className="fin-month-select" id="fin-months" />
          <div id="fin-content" />
        </div>
      </div>

      <div className="toast" id="toast" />

      <style jsx global>{`
        :global(:root) {
          --bg: #0a0a0a;
          --bg2: #111;
          --bg3: #181818;
          --bg4: #1e1e1e;
          --border: #222;
          --green: #00c853;
          --green-dim: rgba(0, 200, 83, 0.08);
          --gold: #ffd700;
          --red: #ff4444;
          --blue: #4488ff;
          --text: #f0f0f0;
          --muted: #555;
          --dim: #888;
          --line-soft: rgba(255, 255, 255, 0.03);
          --hover-soft: rgba(255, 255, 255, 0.015);
          --btn-hover-border: #444;
          --overlay: rgba(0, 0, 0, 0.75);
          --theme-pill: #171717;
          --theme-pill-border: #2a2a2a;
          --theme-pill-text: #b6cdbf;
          --theme-pill-active-bg: #00c853;
          --theme-pill-active-text: #05110a;
        }

        :global(:root[data-theme='light']) {
          --bg: #edf4ef;
          --bg2: #ffffff;
          --bg3: #e8f0ea;
          --bg4: #dfe8e1;
          --border: #cad8cf;
          --green: #00a54a;
          --green-dim: rgba(0, 165, 74, 0.12);
          --gold: #b79100;
          --red: #d74141;
          --blue: #2d70e2;
          --text: #16261d;
          --muted: #5c7467;
          --dim: #3d5348;
          --line-soft: rgba(22, 38, 29, 0.08);
          --hover-soft: rgba(22, 38, 29, 0.06);
          --btn-hover-border: #8ba496;
          --overlay: rgba(17, 35, 24, 0.45);
          --theme-pill: #f6faf7;
          --theme-pill-border: #c4d5ca;
          --theme-pill-text: #385146;
          --theme-pill-active-bg: #00a54a;
          --theme-pill-active-text: #ffffff;
        }

        :global(body) {
          background: var(--bg);
          color: var(--text);
          font-family: 'Sora', sans-serif;
          min-height: 100vh;
        }

        .header {
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .theme-switch {
          display: inline-flex;
          background: var(--theme-pill);
          border: 1px solid var(--theme-pill-border);
          border-radius: 999px;
          padding: 3px;
          gap: 3px;
        }

        .theme-btn {
          border: none;
          background: transparent;
          color: var(--theme-pill-text);
          border-radius: 999px;
          font-family: 'Sora', sans-serif;
          font-size: 10px;
          font-weight: 600;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .theme-btn.active {
          background: var(--theme-pill-active-bg);
          color: var(--theme-pill-active-text);
        }

        .admin-badge {
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          color: var(--gold);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
        }

        .header-title {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
        }

        .btn-logout {
          background: none;
          border: 1px solid var(--border);
          color: var(--dim);
          border-radius: 8px;
          font-size: 12px;
          padding: 7px 14px;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.15s;
        }

        .btn-logout:hover {
          border-color: var(--red);
          color: var(--red);
        }

        @media (max-width: 760px) {
          .header {
            padding: 0 12px;
          }
          .header-title {
            font-size: 14px;
          }
          .theme-btn {
            padding: 4px 8px;
          }
          .btn-logout {
            padding: 6px 10px;
            font-size: 11px;
          }
        }

        .layout {
          display: flex;
          min-height: calc(100vh - 60px);
        }

        .sidebar {
          width: 220px;
          flex-shrink: 0;
          background: var(--bg2);
          border-right: 1px solid var(--border);
          padding: 20px 12px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 13px;
          color: var(--dim);
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 4px;
          user-select: none;
        }

        .nav-item-link {
          text-decoration: none;
        }

        .nav-item:hover {
          background: var(--bg3);
          color: var(--text);
        }

        .nav-item.active {
          background: var(--green-dim);
          color: var(--green);
        }

        .nav-icon {
          font-size: 15px;
          width: 20px;
          text-align: center;
        }

        .nav-badge {
          display: none;
          margin-left: auto;
          background: var(--green);
          color: #000;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          min-width: 18px;
          text-align: center;
        }

        .nav-sep {
          height: 1px;
          background: var(--border);
          margin: 12px 0;
        }

        .main {
          flex: 1;
          padding: 28px;
          overflow-y: auto;
        }

        .stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }

        @media (max-width: 900px) {
          .stats-bar {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px 20px;
        }

        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .stat-value {
          font-family: 'Space Mono', monospace;
          font-size: 26px;
          font-weight: 700;
        }

        .stat-value.green {
          color: var(--green);
        }

        .stat-value.gold {
          color: var(--gold);
        }

        .stat-value.red {
          color: var(--red);
        }

        .stat-value.blue {
          color: var(--blue);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
        }

        .search-input {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          padding: 8px 14px;
          outline: none;
          width: 220px;
        }

        .search-input:focus {
          border-color: rgba(0, 200, 83, 0.3);
        }

        .search-input::placeholder {
          color: var(--muted);
        }

        .table-wrap {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead tr {
          background: var(--bg3);
        }

        th {
          padding: 12px 16px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          font-weight: 600;
          border-bottom: 1px solid var(--border);
        }

        td {
          padding: 13px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--line-soft);
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: var(--hover-soft);
        }

        .user-name {
          font-weight: 600;
          color: var(--text);
        }

        .user-email {
          font-size: 11px;
          color: var(--dim);
          margin-top: 2px;
        }

        .user-phone {
          font-size: 11px;
          color: var(--dim);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .badge.pending {
          background: rgba(255, 215, 0, 0.1);
          color: var(--gold);
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .badge.active {
          background: rgba(0, 200, 83, 0.1);
          color: var(--green);
          border: 1px solid rgba(0, 200, 83, 0.2);
        }

        .badge.disabled {
          background: rgba(255, 68, 68, 0.1);
          color: var(--red);
          border: 1px solid rgba(255, 68, 68, 0.2);
        }

        .badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        .actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .btn-action {
          border: none;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 12px;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-approve {
          background: var(--green-dim);
          color: var(--green);
          border: 1px solid rgba(0, 200, 83, 0.2);
        }

        .btn-approve:hover {
          background: var(--green);
          color: #000;
        }

        .btn-disable {
          background: rgba(255, 68, 68, 0.08);
          color: var(--red);
          border: 1px solid rgba(255, 68, 68, 0.2);
        }

        .btn-disable:hover {
          background: var(--red);
          color: #fff;
        }

        .btn-enable {
          background: rgba(100, 136, 255, 0.08);
          color: var(--blue);
          border: 1px solid rgba(100, 136, 255, 0.2);
        }

        .btn-enable:hover {
          background: var(--blue);
          color: #fff;
        }

        .btn-view {
          background: rgba(255, 255, 255, 0.05);
          color: var(--dim);
          border: 1px solid var(--border);
        }

        .btn-view:hover {
          color: var(--text);
          border-color: var(--btn-hover-border);
        }

        .btn-reset {
          background: rgba(255, 215, 0, 0.07);
          color: var(--gold);
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .btn-reset:hover {
          background: var(--gold);
          color: #000;
        }

        .loading {
          text-align: center;
          padding: 48px;
          color: var(--dim);
          font-size: 14px;
        }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: var(--overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
          backdrop-filter: blur(4px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }

        .modal-overlay.open {
          opacity: 1;
          pointer-events: all;
        }

        .modal {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 28px;
          width: 100%;
          max-width: 540px;
          max-height: 85vh;
          overflow-y: auto;
          transform: scale(0.95);
          transition: transform 0.2s;
        }

        .modal-overlay.open .modal {
          transform: scale(1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--dim);
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .modal-close:hover {
          color: var(--text);
          background: var(--bg3);
        }

        .fin-month-select {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .month-btn {
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--dim);
          border-radius: 8px;
          font-size: 11px;
          padding: 6px 12px;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.15s;
        }

        .month-btn.active {
          background: var(--green-dim);
          border-color: rgba(0, 200, 83, 0.3);
          color: var(--green);
        }

        .fin-section {
          margin-bottom: 16px;
        }

        .fin-section-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border);
        }

        .fin-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 12px;
        }

        .fin-row-name {
          color: var(--dim);
        }

        .fin-row-val {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--text);
        }

        .fin-group-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--dim);
          margin: 8px 0 4px;
          padding-left: 8px;
          border-left: 2px solid var(--border);
        }

        .fin-subrow {
          display: flex;
          justify-content: space-between;
          padding: 4px 0 4px 16px;
          font-size: 11px;
        }

        .fin-subrow-name {
          color: var(--muted);
        }

        .fin-subrow-val {
          font-family: 'Space Mono', monospace;
          color: var(--dim);
        }

        .fin-total {
          display: flex;
          justify-content: space-between;
          padding: 12px 0 0;
          margin-top: 8px;
          border-top: 1px solid var(--border);
          font-weight: 600;
        }

        .fin-total-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--dim);
        }

        .fin-total-val {
          font-family: 'Space Mono', monospace;
          font-size: 15px;
        }

        .fin-total-val.pos {
          color: var(--green);
        }

        .fin-total-val.neg {
          color: var(--red);
        }

        .fin-empty {
          text-align: center;
          padding: 24px;
          color: var(--muted);
          font-size: 13px;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 13px;
          padding: 12px 18px;
          border-radius: 10px;
          transform: translateY(60px);
          opacity: 0;
          transition: all 0.3s;
          z-index: 999;
        }

        .toast.show {
          transform: translateY(0);
          opacity: 1;
        }

        .toast.green {
          border-color: rgba(0, 200, 83, 0.3);
          color: var(--green);
        }

        .toast.red {
          border-color: rgba(255, 68, 68, 0.3);
          color: var(--red);
        }

        .empty {
          text-align: center;
          padding: 48px;
          color: var(--muted);
        }

        .empty-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .view-content {
          display: none;
        }

        .view-content.active {
          display: block;
        }
      `}</style>
    </>
  );
}
