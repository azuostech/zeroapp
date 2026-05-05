'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/src/lib/supabase/browser';

const THEME_KEY = 'zeroapp-theme';
const ALLOWED_MAVF_TIERS = ['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];

const DEFAULTS = {
  receitas: [
    { nome: 'Salário 1', valor: '' },
    { nome: 'Salário 2', valor: '' },
    { nome: 'Aluguel', valor: '' },
    { nome: 'Aposentadoria', valor: '' }
  ],
  'pagar-primeiro': [
    { nome: 'Lucro Primeiro', valor: '' },
    { nome: 'Reserva de Liquidez', valor: '' },
    { nome: 'Outros pagamentos', valor: '' }
  ],
  doar: [
    { nome: 'Dízimos', valor: '' },
    { nome: 'Ofertas', valor: '' },
    { nome: 'Outras doações', valor: '' }
  ],
  contas: [
    { nome: 'Habitação', subcats: [{ nome: 'Aluguel', valor: '' }, { nome: 'Condomínio', valor: '' }, { nome: 'Energia', valor: '' }, { nome: 'Água', valor: '' }] },
    { nome: 'Transporte', subcats: [{ nome: 'Combustível', valor: '' }, { nome: 'Seguro auto', valor: '' }, { nome: 'Estacionamento', valor: '' }] },
    { nome: 'Saúde', subcats: [{ nome: 'Plano de saúde', valor: '' }, { nome: 'Medicamentos', valor: '' }, { nome: 'Consultas', valor: '' }] },
    { nome: 'Educação', subcats: [{ nome: 'Mensalidade', valor: '' }, { nome: 'Cursos', valor: '' }, { nome: 'Material', valor: '' }] },
    { nome: 'Alimentação', subcats: [{ nome: 'Supermercado', valor: '' }, { nome: 'Restaurante', valor: '' }] },
    { nome: 'Cuidados Pessoais', subcats: [{ nome: 'Salão', valor: '' }, { nome: 'Academia', valor: '' }] },
    { nome: 'Impostos', subcats: [{ nome: 'IPTU', valor: '' }, { nome: 'IPVA', valor: '' }] },
    { nome: 'Bancos', subcats: [{ nome: 'Tarifas', valor: '' }, { nome: 'Anuidades', valor: '' }] },
    { nome: 'Cartões', subcats: [{ nome: 'Cartão 1', valor: '' }, { nome: 'Cartão 2', valor: '' }] }
  ],
  investimentos: [{ nome: 'Carteira de Investimentos', valor: '' }, { nome: 'Consórcio', valor: '' }, { nome: 'Cotas', valor: '' }],
  desfrute: [{ nome: 'Viagem', valor: '' }, { nome: 'Jantar', valor: '' }, { nome: 'Lazer', valor: '' }]
};

const BLOCOS_SAIDA = ['pagar-primeiro', 'doar', 'contas', 'investimentos', 'desfrute'];

const clone = (value) => JSON.parse(JSON.stringify(value));

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pm(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

const fr = (n) =>
  'R$ ' +
  Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function fc(n) {
  const value = Number(n || 0);
  if (value === 0) return 'R$ 0';
  if (value >= 1000) {
    return (
      'R$ ' +
      (value / 1000).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }) +
      'k'
    );
  }
  return (
    'R$ ' +
    value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  );
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

export default function FinanceAppPage() {
  const [theme, setTheme] = useState('dark');
  const [canAccessMavf, setCanAccessMavf] = useState(false);
  const [hasActiveMavfSession, setHasActiveMavfSession] = useState(false);

  const handleMavfClick = (event) => {
    if (canAccessMavf) return;
    event.preventDefault();
    window.alert('O MAVF e exclusivo para membros da Mentoria em Grupo (tier MOVIMENTO ou superior).');
  };

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
    let dados = {};
    let currentUser = null;
    let saveTimer = null;
    let mounted = true;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    const toast = (msg) => {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    };

    const getCurrentMonthYear = () => {
      const month = document.getElementById('mesSelect')?.value;
      const year = document.getElementById('anoSelect')?.value;
      if (!month || !year) return null;
      return { month, year };
    };

    const replicarEstrutura = async (operation, successMsg) => {
      const period = getCurrentMonthYear();
      if (!period) return;

      try {
        await apiRequest('/api/finance/structure', {
          method: 'POST',
          body: JSON.stringify({
            month: period.month,
            year: period.year,
            operation
          })
        });
        if (successMsg) toast(successMsg);
      } catch (_) {
        toast('Não foi possível replicar para os demais meses');
      }
    };

    const perguntarReplicarInclusao = () =>
      window.confirm(
        'Deseja replicar este campo para os demais meses?\n\nOK = replicar para os demais meses\nCancelar = somente neste mês'
      );

    const perguntarReplicarExclusao = () =>
      window.confirm(
        'Deseja excluir este campo dos demais meses também?\n\nOK = excluir de todos os meses\nCancelar = excluir somente neste mês'
      );

    const numOnly = (event) => {
      if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Enter', '.'].includes(event.key) || /^[0-9,]$/.test(event.key)) {
        return;
      }
      event.preventDefault();
    };

    const salvarNuvem = async () => {
      try {
        const mes = document.getElementById('mesSelect')?.value;
        const ano = document.getElementById('anoSelect')?.value;

        await apiRequest('/api/finance/month', {
          method: 'POST',
          body: JSON.stringify({
            month: mes,
            year: ano,
            data: dados
          })
        });

        const dot = document.getElementById('save-dot');
        const lbl = document.getElementById('save-label');
        dot?.classList.remove('saving');
        if (!lbl) return;
        lbl.textContent = '✓ Salvo';
        setTimeout(() => {
          if (lbl.textContent === '✓ Salvo') lbl.textContent = '';
        }, 2500);
      } catch (_) {
        const dot = document.getElementById('save-dot');
        const lbl = document.getElementById('save-label');
        dot?.classList.remove('saving');
        if (lbl) lbl.textContent = '⚠ Erro ao salvar';
      }
    };

    const agendarSalvar = () => {
      const dot = document.getElementById('save-dot');
      const lbl = document.getElementById('save-label');
      dot?.classList.add('saving');
      if (lbl) lbl.textContent = 'Salvando...';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(salvarNuvem, 1500);
    };

    const calcularTotais = () => {
      const t = {};
      ['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute'].forEach((bloco) => {
        t[bloco] = (dados[bloco] || []).reduce((acc, cat) => acc + pm(cat.valor), 0);
      });

      t.contas = (dados.contas || []).reduce((acc, grupo) => acc + (grupo.subcats || []).reduce((inner, sub) => inner + pm(sub.valor), 0), 0);

      Object.keys(t).forEach((bloco) => {
        const el = document.getElementById(`total-${bloco}`);
        if (el) el.textContent = fc(t[bloco]);
      });

      setText('s-receitas', fc(t.receitas || 0));
      setText('s-pagar', fc(t['pagar-primeiro'] || 0));
      setText('s-doar', fc(t.doar || 0));
      setText('s-contas', fc(t.contas || 0));
      setText('s-invest', fc(t.investimentos || 0));
      setText('s-desfrute', fc(t.desfrute || 0));

      const saldo = (t.receitas || 0) - BLOCOS_SAIDA.reduce((acc, bloco) => acc + (t[bloco] || 0), 0);
      const totalEl = document.getElementById('s-total');
      if (!totalEl) return;
      totalEl.textContent = fr(saldo);
      totalEl.className = `saldo-final-value${saldo < 0 ? ' neg' : ''}`;
    };

    const atualizarTotalGrupo = (gi) => {
      const el = document.getElementById(`gtotal-${gi}`);
      if (!el) return;
      const total = (dados.contas[gi]?.subcats || []).reduce((acc, sub) => acc + pm(sub.valor), 0);
      el.textContent = total > 0 ? fc(total) : '';
    };

    const renderSubcats = (gi) => {
      const container = document.getElementById(`subcats-${gi}`);
      if (!container) return;
      container.innerHTML = '';

      (dados.contas[gi]?.subcats || []).forEach((sub, si) => {
        const row = document.createElement('div');
        row.className = 'subcat-row';
        row.innerHTML = `<div class="subcat-nome">${esc(sub.nome)}</div>
          <input type="text" class="subcat-input" inputmode="decimal" placeholder="R$ 0,00" value="${esc(sub.valor)}"
            onchange="atualizarSubcat(${gi},${si},this.value)" onkeydown="numOnly(event)" onfocus="this.select()">
          <button class="subcat-remove" onclick="removerSubcat(${gi},${si})">✕</button>`;
        container.appendChild(row);
      });

      atualizarTotalGrupo(gi);
    };

    const buildGrupo = (grupo, gi) => {
      const wrap = document.createElement('div');
      wrap.className = 'grupo';
      wrap.id = `grupo-${gi}`;
      wrap.innerHTML = `
        <div class="grupo-header" onclick="toggleGrupo(${gi})">
          <div class="grupo-left"><span class="grupo-arrow">▶</span><span class="grupo-nome">${esc(grupo.nome)}</span></div>
          <div class="grupo-right">
            <span class="grupo-total" id="gtotal-${gi}"></span>
            <button class="grupo-remove-btn" onclick="removerGrupo(event,${gi})">✕</button>
          </div>
        </div>
        <div class="grupo-body" id="gbody-${gi}">
          <div id="subcats-${gi}"></div>
          <div class="add-subcat-row">
            <input type="text" class="add-subcat-input" id="new-sub-${gi}" placeholder="+ Nova subcategoria">
            <button class="add-subcat-btn" onclick="adicionarSubcat(${gi})">Adicionar</button>
          </div>
        </div>`;

      setTimeout(() => renderSubcats(gi), 0);
      return wrap;
    };

    const renderBlocoContas = () => {
      const container = document.getElementById('grupos-contas');
      if (!container) return;
      container.innerHTML = '';
      (dados.contas || []).forEach((grupo, gi) => container.appendChild(buildGrupo(grupo, gi)));
    };

    const renderBlocoSimples = (bloco) => {
      const container = document.getElementById(`cats-${bloco}`);
      if (!container) return;
      container.innerHTML = '';

      (dados[bloco] || []).forEach((cat, i) => {
        const row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML = `<div class="cat-nome">${esc(cat.nome)}</div>
          <input type="text" class="cat-input" inputmode="decimal" placeholder="R$ 0,00" value="${esc(cat.valor)}"
            onchange="atualizarSimples('${bloco}',${i},this.value)" onkeydown="numOnly(event)" onfocus="this.select()">
          <button class="cat-remove" onclick="removerCat('${bloco}',${i})">✕</button>`;
        container.appendChild(row);
      });
    };

    const renderTudo = () => {
      ['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute'].forEach(renderBlocoSimples);
      renderBlocoContas();
      calcularTotais();
    };

    const carregarDados = async () => {
      const mes = document.getElementById('mesSelect')?.value;
      const ano = document.getElementById('anoSelect')?.value;
      if (!mes || !ano) return;

      const payload = await apiRequest(`/api/finance/month?month=${mes}&year=${ano}`);
      dados = payload?.data && Object.keys(payload.data).length > 0 ? payload.data : clone(DEFAULTS);
      renderTudo();
    };

    const trocarMes = async () => {
      await carregarDados();
    };

    const toggleBloco = (bloco) => {
      document.getElementById(`bloco-${bloco}`)?.classList.toggle('open');
    };

    const toggleGrupo = (gi) => {
      document.getElementById(`grupo-${gi}`)?.classList.toggle('gopen');
    };

    const adicionarCat = (bloco) => {
      const input = document.getElementById(`new-${bloco}`);
      const nome = input?.value.trim();
      if (!nome) return;

      if (!dados[bloco]) dados[bloco] = [];
      dados[bloco].push({ nome, valor: '' });
      input.value = '';
      renderBlocoSimples(bloco);
      calcularTotais();
      agendarSalvar();
      toast('Categoria adicionada');

      if (perguntarReplicarInclusao()) {
        replicarEstrutura(
          { type: 'add_category', bloco, nome },
          'Campo replicado para os demais meses'
        );
      }
    };

    const removerCat = (bloco, i) => {
      const nome = dados[bloco]?.[i]?.nome;
      const replicar = Boolean(nome) && perguntarReplicarExclusao();
      dados[bloco].splice(i, 1);
      renderBlocoSimples(bloco);
      calcularTotais();
      agendarSalvar();

      if (replicar) {
        replicarEstrutura(
          { type: 'remove_category', bloco, nome },
          'Exclusão replicada para os demais meses'
        );
      }
    };

    const atualizarSimples = (bloco, i, val) => {
      dados[bloco][i].valor = val;
      calcularTotais();
      agendarSalvar();
    };

    const adicionarGrupo = () => {
      const input = document.getElementById('new-grupo-contas');
      const nome = input?.value.trim();
      if (!nome) return;
      dados.contas.push({ nome, subcats: [] });
      input.value = '';
      renderBlocoContas();
      const gi = dados.contas.length - 1;
      setTimeout(() => document.getElementById(`grupo-${gi}`)?.classList.add('gopen'), 30);
      calcularTotais();
      agendarSalvar();
      toast('Grupo adicionado');

      if (perguntarReplicarInclusao()) {
        replicarEstrutura({ type: 'add_group', nome }, 'Grupo replicado para os demais meses');
      }
    };

    const removerGrupo = (event, gi) => {
      event.stopPropagation();
      if ((dados.contas[gi]?.subcats || []).length > 0 && !window.confirm(`Remover "${dados.contas[gi].nome}"?`)) return;
      const nomeGrupo = dados.contas[gi]?.nome;
      const replicar = Boolean(nomeGrupo) && perguntarReplicarExclusao();
      dados.contas.splice(gi, 1);
      renderBlocoContas();
      calcularTotais();
      agendarSalvar();

      if (replicar) {
        replicarEstrutura(
          { type: 'remove_group', nome: nomeGrupo },
          'Exclusão replicada para os demais meses'
        );
      }
    };

    const adicionarSubcat = (gi) => {
      const input = document.getElementById(`new-sub-${gi}`);
      const nome = input?.value.trim();
      if (!nome) return;
      const groupName = dados.contas[gi]?.nome;
      dados.contas[gi].subcats.push({ nome, valor: '' });
      input.value = '';
      renderSubcats(gi);
      calcularTotais();
      agendarSalvar();
      toast('Subcategoria adicionada');

      if (groupName && perguntarReplicarInclusao()) {
        replicarEstrutura(
          { type: 'add_subcategory', groupName, nome },
          'Subcategoria replicada para os demais meses'
        );
      }
    };

    const removerSubcat = (gi, si) => {
      const groupName = dados.contas[gi]?.nome;
      const nome = dados.contas[gi]?.subcats?.[si]?.nome;
      const replicar = Boolean(groupName && nome) && perguntarReplicarExclusao();
      dados.contas[gi].subcats.splice(si, 1);
      renderSubcats(gi);
      calcularTotais();
      agendarSalvar();

      if (replicar) {
        replicarEstrutura(
          { type: 'remove_subcategory', groupName, nome },
          'Exclusão replicada para os demais meses'
        );
      }
    };

    const atualizarSubcat = (gi, si, val) => {
      dados.contas[gi].subcats[si].valor = val;
      atualizarTotalGrupo(gi);
      calcularTotais();
      agendarSalvar();
    };

    const limparMes = async () => {
      if (!window.confirm('Zerar todos os valores deste mês?')) return;
      ['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute'].forEach((bloco) =>
        (dados[bloco] || []).forEach((cat) => {
          cat.valor = '';
        })
      );
      (dados.contas || []).forEach((grupo) =>
        (grupo.subcats || []).forEach((sub) => {
          sub.valor = '';
        })
      );
      renderTudo();
      agendarSalvar();
      toast('Mês zerado');
    };

    const exportarTexto = () => {
      const mes = document.getElementById('mesSelect')?.value;
      const ano = document.getElementById('anoSelect')?.value;
      const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      let txt = `CONTROLE FINANCEIRO — MÉTODO JACKSON SOUZA\n${MESES[parseInt(mes, 10)]} ${ano}\n${'═'.repeat(42)}\n\n`;

      [
        { key: 'receitas', label: '1. RECEITAS' },
        { key: 'pagar-primeiro', label: '2. SE PAGAR PRIMEIRO' },
        { key: 'doar', label: '3. DOAR' }
      ].forEach(({ key, label }) => {
        txt += `${label}\n${'─'.repeat(30)}\n`;
        (dados[key] || [])
          .filter((c) => pm(c.valor) > 0)
          .forEach((c) => {
            txt += `  ${c.nome.padEnd(24)} ${fr(pm(c.valor))}\n`;
          });
        txt += `  ${'TOTAL'.padEnd(24)} ${fr((dados[key] || []).reduce((a, c) => a + pm(c.valor), 0))}\n\n`;
      });

      const totalContas = (dados.contas || []).reduce((a, g) => a + (g.subcats || []).reduce((b, s) => b + pm(s.valor), 0), 0);
      txt += `4. PAGAR AS CONTAS\n${'─'.repeat(30)}\n`;

      (dados.contas || []).forEach((g) => {
        const gt = (g.subcats || []).reduce((a, s) => a + pm(s.valor), 0);
        if (!gt) return;
        txt += `  ${g.nome}\n`;
        (g.subcats || [])
          .filter((s) => pm(s.valor) > 0)
          .forEach((s) => {
            txt += `    ${s.nome.padEnd(22)} ${fr(pm(s.valor))}\n`;
          });
        txt += `    ${'Subtotal'.padEnd(22)} ${fr(gt)}\n`;
      });

      txt += `  ${'TOTAL'.padEnd(24)} ${fr(totalContas)}\n\n`;

      [
        { key: 'investimentos', label: '5. INVESTIMENTOS' },
        { key: 'desfrute', label: '6. DESFRUTE' }
      ].forEach(({ key, label }) => {
        txt += `${label}\n${'─'.repeat(30)}\n`;
        (dados[key] || [])
          .filter((c) => pm(c.valor) > 0)
          .forEach((c) => {
            txt += `  ${c.nome.padEnd(24)} ${fr(pm(c.valor))}\n`;
          });
        txt += `  ${'TOTAL'.padEnd(24)} ${fr((dados[key] || []).reduce((a, c) => a + pm(c.valor), 0))}\n\n`;
      });

      const receitas = (dados.receitas || []).reduce((a, c) => a + pm(c.valor), 0);
      const saidas = BLOCOS_SAIDA.reduce((a, bloco) => {
        if (bloco === 'contas') return a + totalContas;
        return a + (dados[bloco] || []).reduce((x, c) => x + pm(c.valor), 0);
      }, 0);

      txt += `${'═'.repeat(42)}\nSALDO DO MÊS: ${fr(receitas - saidas)}\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financas_${mes}_${ano}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Resumo exportado');
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

    const handleEnter = (event) => {
      if (event.key !== 'Enter') return;
      const el = document.activeElement;
      if (!el) return;

      if (el.id === 'new-grupo-contas') adicionarGrupo();
      else if (el.id.startsWith('new-sub-')) adicionarSubcat(parseInt(el.id.replace('new-sub-', ''), 10));
      else if (el.id.startsWith('new-')) adicionarCat(el.id.replace('new-', ''));
    };

    const init = async () => {
      try {
        const payload = await apiRequest('/api/profile/me');
        if (!mounted) return;

        if (!payload?.profile || payload.profile.status !== 'active') {
          await logout();
          return;
        }

        if (payload.profile.role === 'admin') {
          window.location.href = '/admin';
          return;
        }

        const tier = payload.profile.tier || 'DESPERTAR';
        const canAccess = ALLOWED_MAVF_TIERS.includes(tier);
        let hasActiveSession = false;

        if (canAccess) {
          try {
            const sessionsPayload = await apiRequest('/api/mavf/sessions');
            const sessions = Array.isArray(sessionsPayload?.sessions) ? sessionsPayload.sessions : [];
            hasActiveSession = sessions.some((session) => session?.status === 'active');
          } catch (_) {
            hasActiveSession = false;
          }
        }

        if (mounted) {
          setCanAccessMavf(canAccess);
          setHasActiveMavfSession(hasActiveSession);
        }

        currentUser = payload.user;
        setText('user-name-label', payload.profile.full_name || currentUser.email);

        const now = new Date();
        const mesSelect = document.getElementById('mesSelect');
        const anoSelect = document.getElementById('anoSelect');
        if (mesSelect) mesSelect.value = String(now.getMonth() + 1).padStart(2, '0');
        if (anoSelect) anoSelect.value = String(now.getFullYear());

        await carregarDados();

        const loading = document.getElementById('loading-screen');
        const header = document.getElementById('app-header');
        const main = document.getElementById('app-main');

        if (loading) loading.style.display = 'none';
        if (header) header.style.display = '';
        if (main) main.style.display = '';
      } catch (_) {
        window.location.href = '/';
      }
    };

    window.numOnly = numOnly;
    window.trocarMes = trocarMes;
    window.toggleBloco = toggleBloco;
    window.toggleGrupo = toggleGrupo;
    window.adicionarCat = adicionarCat;
    window.removerCat = removerCat;
    window.atualizarSimples = atualizarSimples;
    window.adicionarGrupo = adicionarGrupo;
    window.removerGrupo = removerGrupo;
    window.adicionarSubcat = adicionarSubcat;
    window.removerSubcat = removerSubcat;
    window.atualizarSubcat = atualizarSubcat;
    window.limparMes = limparMes;
    window.exportarTexto = exportarTexto;
    window.logout = logout;

    document.addEventListener('keydown', handleEnter);
    init();

    return () => {
      mounted = false;
      clearTimeout(saveTimer);
      document.removeEventListener('keydown', handleEnter);
      delete window.numOnly;
      delete window.trocarMes;
      delete window.toggleBloco;
      delete window.toggleGrupo;
      delete window.adicionarCat;
      delete window.removerCat;
      delete window.atualizarSimples;
      delete window.adicionarGrupo;
      delete window.removerGrupo;
      delete window.adicionarSubcat;
      delete window.removerSubcat;
      delete window.atualizarSubcat;
      delete window.limparMes;
      delete window.exportarTexto;
      delete window.logout;
    };
  }, []);

  const mavfLocked = !canAccessMavf;
  const mavfHref = mavfLocked ? '#' : '/mavf';
  const mavfHistoryHref = mavfLocked ? '#' : '/mavf/historico';

  return (
    <>
      <div className="loading-screen" id="loading-screen">
        <div className="spinner" />
        <p>Carregando seus dados...</p>
      </div>

      <header className="header" style={{ display: 'none' }} id="app-header">
        <div className="header-brand">
          <div className="brand-dot" />
          <div>
            <div className="brand-name">Jackson Souza</div>
            <div className="brand-sub">Finanças do Zero</div>
          </div>
        </div>
        <div className="header-nav">
          <a className="top-nav-item active" href="/app">
            <span className="icon">🏠</span>
            Início
          </a>
          <a
            className={`top-nav-item${mavfLocked ? ' locked' : ''}${hasActiveMavfSession ? ' has-notification' : ''}`}
            href={mavfHref}
            onClick={handleMavfClick}
            aria-disabled={mavfLocked}
          >
            <span className="icon">📊</span>
            Meu MAVF
            {mavfLocked ? <span className="top-nav-lock">🔒</span> : null}
            {hasActiveMavfSession ? <span className="top-nav-badge">Ativa</span> : null}
          </a>
        </div>
        <div className="header-right">
          <div className="save-indicator">
            <div className="save-dot" id="save-dot" />
            <span id="save-label" />
          </div>
          <div className="user-name" id="user-name-label" />
          <div className="header-month">
            <select className="month-select" id="mesSelect" onChange={() => window.trocarMes?.()}>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
            <select className="month-select" id="anoSelect" onChange={() => window.trocarMes?.()}>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>
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

      <main className="main" style={{ display: 'none' }} id="app-main">
        <div className="intro">
          <div className="intro-title">Sequência do Método</div>
          <div className="intro-steps">
            <span className="step-pill" style={{ color: 'var(--green)', borderColor: 'rgba(0,200,83,0.3)', background: 'rgba(0,200,83,0.06)' }}>
              1 · Receitas
            </span>
            <span className="step-pill" style={{ color: 'var(--gold)', borderColor: 'rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.06)' }}>
              2 · Se Pagar Primeiro
            </span>
            <span className="step-pill" style={{ color: '#64B4FF', borderColor: 'rgba(100,180,255,0.3)', background: 'rgba(100,180,255,0.06)' }}>
              3 · Doar
            </span>
            <span className="step-pill" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)' }}>
              4 · Pagar as Contas
            </span>
            <span className="step-pill" style={{ color: '#B464FF', borderColor: 'rgba(180,100,255,0.3)', background: 'rgba(180,100,255,0.06)' }}>
              5 · Investimentos
            </span>
            <span className="step-pill" style={{ color: '#FF8C00', borderColor: 'rgba(255,140,0,0.3)', background: 'rgba(255,140,0,0.06)' }}>
              6 · Desfrute
            </span>
          </div>
        </div>

        <div className="saldos-bar">
          <div className="saldos-grid">
            <div className="saldo-item">
              <div className="saldo-label">Receitas</div>
              <div className="saldo-value" id="s-receitas">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Se Pagar 1°</div>
              <div className="saldo-value" id="s-pagar">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Doação</div>
              <div className="saldo-value" id="s-doar">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Contas</div>
              <div className="saldo-value" id="s-contas">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Invest.</div>
              <div className="saldo-value" id="s-invest">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Desfrute</div>
              <div className="saldo-value" id="s-desfrute">
                R$ 0
              </div>
            </div>
          </div>
          <div className="saldo-final">
            <div className="saldo-final-label">Saldo do Mês</div>
            <div className="saldo-final-value" id="s-total">
              R$ 0,00
            </div>
          </div>
        </div>

        <div className="actions-bar">
          <button className="btn btn-primary" onClick={() => window.limparMes?.()}>
            ↺ Limpar mês
          </button>
          <button className="btn btn-outline" onClick={() => window.exportarTexto?.()}>
            ↓ Exportar resumo
          </button>
        </div>

        <div id="blocos-container">
          <div className="bloco open" data-bloco="receitas" id="bloco-receitas">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('receitas')}>
              <div className="bloco-left">
                <div className="bloco-icon">💰</div>
                <div>
                  <div className="bloco-titulo">1. Receitas</div>
                  <div className="bloco-desc">Todo dinheiro que entra no mês</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-receitas">
                  R$ 0
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div id="cats-receitas" />
              <div className="add-row">
                <input type="text" className="add-input" id="new-receitas" placeholder="+ Nova receita (ex: Freelance)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('receitas')}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="bloco" data-bloco="pagar-primeiro" id="bloco-pagar-primeiro">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('pagar-primeiro')}>
              <div className="bloco-left">
                <div className="bloco-icon">⭐</div>
                <div>
                  <div className="bloco-titulo">2. Se Pagar Primeiro</div>
                  <div className="bloco-desc">Antes de qualquer conta, você se paga</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-pagar-primeiro">
                  R$ 0
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div id="cats-pagar-primeiro" />
              <div className="add-row">
                <input type="text" className="add-input" id="new-pagar-primeiro" placeholder="+ Adicionar (ex: Reserva de emergência)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('pagar-primeiro')}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="bloco" data-bloco="doar" id="bloco-doar">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('doar')}>
              <div className="bloco-left">
                <div className="bloco-icon">🤲</div>
                <div>
                  <div className="bloco-titulo">3. Doar</div>
                  <div className="bloco-desc">Movimento a favor do próximo</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-doar">
                  R$ 0
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div id="cats-doar" />
              <div className="add-row">
                <input type="text" className="add-input" id="new-doar" placeholder="+ Adicionar (ex: Missões)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('doar')}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="bloco" data-bloco="contas" id="bloco-contas">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('contas')}>
              <div className="bloco-left">
                <div className="bloco-icon">📋</div>
                <div>
                  <div className="bloco-titulo">4. Pagar as Contas</div>
                  <div className="bloco-desc">Grupos com subcategorias personalizáveis</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-contas">
                  R$ 0
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div id="grupos-contas" />
              <div className="add-grupo-row">
                <input type="text" className="add-grupo-input" id="new-grupo-contas" placeholder="+ Novo grupo (ex: Saúde, Lazer...)" />
                <button className="add-grupo-btn" onClick={() => window.adicionarGrupo?.()}>
                  + Grupo
                </button>
              </div>
            </div>
          </div>

          <div className="bloco" data-bloco="investimentos" id="bloco-investimentos">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('investimentos')}>
              <div className="bloco-left">
                <div className="bloco-icon">📈</div>
                <div>
                  <div className="bloco-titulo">5. Investimentos</div>
                  <div className="bloco-desc">Construção de patrimônio</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-investimentos">
                  R$ 0
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div id="cats-investimentos" />
              <div className="add-row">
                <input type="text" className="add-input" id="new-investimentos" placeholder="+ Adicionar (ex: Tesouro Direto)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('investimentos')}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="bloco" data-bloco="desfrute" id="bloco-desfrute">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('desfrute')}>
              <div className="bloco-left">
                <div className="bloco-icon">🌟</div>
                <div>
                  <div className="bloco-titulo">6. Desfrute</div>
                  <div className="bloco-desc">Viver bem faz parte do plano</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-desfrute">
                  R$ 0
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div id="cats-desfrute" />
              <div className="add-row">
                <input type="text" className="add-input" id="new-desfrute" placeholder="+ Adicionar (ex: Cinema)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('desfrute')}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <nav className="bottom-nav">
        <a className="bottom-nav-tab active" href="/app">
          <span className="icon">🏠</span>
          <span className="label">Início</span>
        </a>
        <a
          className={`bottom-nav-tab${mavfLocked ? ' locked' : ''}${hasActiveMavfSession ? ' has-notification' : ''}`}
          href={mavfHref}
          onClick={handleMavfClick}
          aria-disabled={mavfLocked}
        >
          <span className="icon">📊</span>
          <span className="label">MAVF</span>
        </a>
        <a className={`bottom-nav-tab${mavfLocked ? ' locked' : ''}`} href={mavfHistoryHref} onClick={handleMavfClick} aria-disabled={mavfLocked}>
          <span className="icon">🕘</span>
          <span className="label">Histórico</span>
        </a>
      </nav>

      <div className="toast" id="toast" />

      <style jsx global>{`
        :global(:root) {
          --bg: #0a0a0a;
          --bg2: #141414;
          --bg3: #1c1c1c;
          --bg4: #222;
          --border: #2a2a2a;
          --border2: #242424;
          --green: #00c853;
          --green-dim: rgba(0, 200, 83, 0.08);
          --green-glow: rgba(0, 200, 83, 0.25);
          --red: #ff4444;
          --gold: #ffd700;
          --text: #f0f0f0;
          --muted: #555;
          --dim: #888;
          --line-soft: rgba(255, 255, 255, 0.025);
          --line-softer: rgba(255, 255, 255, 0.02);
          --hover-soft: rgba(255, 255, 255, 0.018);
          --hover-softer: rgba(255, 255, 255, 0.012);
          --btn-outline-hover-border: #444;
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
          --border2: #d7e2da;
          --green: #00a54a;
          --green-dim: rgba(0, 165, 74, 0.12);
          --green-glow: rgba(0, 165, 74, 0.2);
          --red: #d74141;
          --gold: #b79100;
          --text: #16261d;
          --muted: #5c7467;
          --dim: #3d5348;
          --line-soft: rgba(22, 38, 29, 0.08);
          --line-softer: rgba(22, 38, 29, 0.06);
          --hover-soft: rgba(22, 38, 29, 0.06);
          --hover-softer: rgba(22, 38, 29, 0.04);
          --btn-outline-hover-border: #8ba496;
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
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 200;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 14px;
          flex: 1;
        }

        .top-nav-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid var(--border);
          border-radius: 9px;
          text-decoration: none;
          font-size: 12px;
          color: var(--dim);
          background: transparent;
          transition: all 0.15s;
          position: relative;
        }

        .top-nav-item:hover {
          color: var(--text);
          background: var(--bg3);
        }

        .top-nav-item.active {
          color: var(--green);
          border-color: rgba(0, 200, 83, 0.35);
          background: var(--green-dim);
          font-weight: 600;
        }

        .top-nav-item .icon {
          font-size: 14px;
          line-height: 1;
        }

        .top-nav-item.locked {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .top-nav-lock {
          margin-left: 2px;
          font-size: 12px;
        }

        .top-nav-badge {
          margin-left: 2px;
          font-size: 10px;
          font-weight: 700;
          color: #06170d;
          background: var(--green);
          border-radius: 999px;
          padding: 2px 6px;
        }

        .top-nav-item.has-notification::before {
          content: '';
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          background: var(--green);
          border-radius: 50%;
        }

        .brand-dot {
          width: 9px;
          height: 9px;
          background: var(--green);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--green-glow);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }

        .brand-name {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: var(--green);
        }

        .brand-sub {
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
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

        .user-name {
          font-size: 12px;
          color: var(--dim);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-month {
          display: flex;
          gap: 8px;
        }

        .month-select {
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          outline: none;
        }

        .month-select:focus {
          border-color: var(--green);
        }

        .btn-logout {
          background: none;
          border: 1px solid var(--border);
          color: var(--dim);
          border-radius: 8px;
          font-size: 11px;
          padding: 6px 12px;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.15s;
        }

        .btn-logout:hover {
          border-color: var(--red);
          color: var(--red);
        }

        @media (max-width: 1080px) {
          .header-nav {
            display: none;
          }
        }

        @media (max-width: 880px) {
          .header {
            padding: 0 10px;
          }
          .header-right {
            gap: 8px;
          }
          .user-name {
            display: none;
          }
          .month-select {
            font-size: 11px;
            padding: 6px 8px;
          }
          .theme-btn {
            padding: 4px 8px;
          }
        }

        @media (max-width: 620px) {
          .save-indicator {
            display: none;
          }
          .brand-sub {
            display: none;
          }
          .btn-logout {
            padding: 6px 9px;
          }
        }

        .save-indicator {
          font-size: 10px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .save-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: blink 1s ease infinite;
          display: none;
        }

        .save-dot.saving {
          display: block;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }

        .main {
          max-width: 780px;
          margin: 0 auto;
          padding: 24px 16px 80px;
        }

        .bottom-nav {
          display: none;
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 210;
          background: var(--bg2);
          border-top: 1px solid var(--border);
          padding: 8px 8px max(8px, env(safe-area-inset-bottom));
          justify-content: space-around;
          gap: 6px;
        }

        .bottom-nav-tab {
          flex: 1;
          max-width: 132px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 48px;
          text-decoration: none;
          color: var(--dim);
          border-radius: 10px;
          transition: all 0.15s;
          position: relative;
        }

        .bottom-nav-tab.active {
          color: var(--green);
          background: var(--green-dim);
          font-weight: 600;
        }

        .bottom-nav-tab .icon {
          font-size: 18px;
          line-height: 1;
        }

        .bottom-nav-tab .label {
          font-size: 10px;
          letter-spacing: 0.2px;
        }

        .bottom-nav-tab.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bottom-nav-tab.locked::after {
          content: '🔒';
          position: absolute;
          top: 4px;
          right: 12px;
          font-size: 10px;
        }

        .bottom-nav-tab.has-notification::before {
          content: '';
          position: absolute;
          top: 6px;
          right: 14px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
        }

        @media (max-width: 760px) {
          .bottom-nav {
            display: flex;
          }

          .main {
            padding-bottom: 120px;
          }
        }

        .intro {
          margin-bottom: 24px;
        }

        .intro-title {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .intro-steps {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .step-pill {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 500;
          border: 1px solid;
        }

        .saldos-bar {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 24px;
        }

        .saldos-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .saldos-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .saldo-item {
          text-align: center;
        }

        .saldo-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          margin-bottom: 5px;
        }

        .saldo-value {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: var(--green);
        }

        .saldo-final {
          border-top: 1px solid var(--border);
          padding-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .saldo-final-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--muted);
        }

        .saldo-final-value {
          font-family: 'Space Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: var(--green);
          transition: color 0.3s;
        }

        .saldo-final-value.neg {
          color: var(--red);
        }

        .actions-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .btn {
          border-radius: 10px;
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 9px 18px;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }

        .btn-primary {
          background: var(--green);
          color: #000;
        }

        .btn-primary:hover {
          background: #00e060;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--dim);
        }

        .btn-outline:hover {
          border-color: var(--btn-outline-hover-border);
          color: var(--text);
        }

        .bloco {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 12px;
          overflow: hidden;
          animation: slideIn 0.3s ease both;
        }

        .bloco:nth-child(1) {
          animation-delay: 0.04s;
        }
        .bloco:nth-child(2) {
          animation-delay: 0.08s;
        }
        .bloco:nth-child(3) {
          animation-delay: 0.12s;
        }
        .bloco:nth-child(4) {
          animation-delay: 0.16s;
        }
        .bloco:nth-child(5) {
          animation-delay: 0.2s;
        }
        .bloco:nth-child(6) {
          animation-delay: 0.24s;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .bloco-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
          transition: background 0.12s;
        }

        .bloco-header:hover {
          background: var(--bg3);
        }

        .bloco-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .bloco-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }

        .bloco-titulo {
          font-size: 14px;
          font-weight: 600;
        }

        .bloco-desc {
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
        }

        .bloco-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .bloco-total {
          font-family: 'Space Mono', monospace;
          font-size: 14px;
          font-weight: 700;
        }

        .bloco-chevron {
          color: var(--muted);
          font-size: 11px;
          transition: transform 0.2s;
        }

        .bloco.open .bloco-chevron {
          transform: rotate(180deg);
        }

        .bloco-body {
          display: none;
          border-top: 1px solid var(--border);
        }

        .bloco.open .bloco-body {
          display: block;
        }

        .cat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 20px;
          border-bottom: 1px solid var(--line-soft);
          transition: background 0.1s;
        }

        .cat-row:hover {
          background: var(--bg3);
        }

        .cat-row:last-of-type {
          border-bottom: none;
        }

        .cat-nome {
          flex: 1;
          font-size: 13px;
          color: var(--dim);
        }

        .cat-input {
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          padding: 7px 12px;
          width: 140px;
          text-align: right;
          outline: none;
          transition: border-color 0.15s;
        }

        .cat-input:focus {
          border-color: var(--green);
          background: var(--bg3);
        }

        @media (max-width: 480px) {
          .cat-input {
            width: 110px;
            font-size: 12px;
          }
        }

        .cat-remove {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 15px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .cat-remove:hover {
          color: var(--red);
        }

        .add-row {
          display: flex;
          gap: 8px;
          padding: 11px 20px;
          background: var(--bg3);
          border-top: 1px solid var(--border);
        }

        .add-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          padding: 8px 12px;
          outline: none;
        }

        .add-input:focus {
          border-color: var(--green);
        }

        .add-input::placeholder {
          color: var(--muted);
        }

        .add-btn {
          background: var(--green-dim);
          border: 1px solid var(--green);
          color: var(--green);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .add-btn:hover {
          background: var(--green);
          color: #000;
        }

        .grupo {
          border-bottom: 1px solid var(--border2);
        }

        .grupo:last-child {
          border-bottom: none;
        }

        .grupo-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          cursor: pointer;
          user-select: none;
          transition: background 0.1s;
        }

        .grupo-header:hover {
          background: var(--hover-soft);
        }

        .grupo-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .grupo-arrow {
          font-size: 10px;
          color: var(--muted);
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .grupo.gopen .grupo-arrow {
          transform: rotate(90deg);
        }

        .grupo-nome {
          font-size: 13px;
          font-weight: 600;
          color: var(--dim);
        }

        .grupo-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .grupo-total {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--red);
          min-width: 60px;
          text-align: right;
        }

        .grupo-remove-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 14px;
          padding: 3px 5px;
          border-radius: 4px;
          transition: color 0.15s;
        }

        .grupo-remove-btn:hover {
          color: var(--red);
        }

        .grupo-body {
          display: none;
        }

        .grupo.gopen .grupo-body {
          display: block;
        }

        .subcat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 20px 9px 46px;
          border-bottom: 1px solid var(--line-softer);
          transition: background 0.1s;
        }

        .subcat-row:hover {
          background: var(--hover-softer);
        }

        .subcat-row:last-of-type {
          border-bottom: none;
        }

        .subcat-nome {
          flex: 1;
          font-size: 12px;
          color: var(--muted);
        }

        .subcat-input {
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          padding: 6px 10px;
          width: 130px;
          text-align: right;
          outline: none;
          transition: border-color 0.15s;
        }

        .subcat-input:focus {
          border-color: rgba(255, 68, 68, 0.45);
          background: var(--bg3);
        }

        @media (max-width: 480px) {
          .subcat-input {
            width: 100px;
            font-size: 11px;
          }
        }

        .subcat-remove {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 13px;
          padding: 3px;
          border-radius: 4px;
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .subcat-remove:hover {
          color: var(--red);
        }

        .add-subcat-row {
          display: flex;
          gap: 8px;
          padding: 8px 16px 8px 46px;
          background: rgba(255, 68, 68, 0.025);
          border-top: 1px solid rgba(255, 68, 68, 0.06);
        }

        .add-subcat-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          padding: 7px 10px;
          outline: none;
        }

        .add-subcat-input:focus {
          border-color: rgba(255, 68, 68, 0.35);
        }

        .add-subcat-input::placeholder {
          color: var(--muted);
        }

        .add-subcat-btn {
          background: rgba(255, 68, 68, 0.08);
          border: 1px solid rgba(255, 68, 68, 0.25);
          color: var(--red);
          border-radius: 7px;
          font-size: 11px;
          font-weight: 600;
          padding: 7px 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .add-subcat-btn:hover {
          background: var(--red);
          color: #fff;
        }

        .add-grupo-row {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255, 68, 68, 0.03);
          border-top: 1px solid rgba(255, 68, 68, 0.07);
        }

        .add-grupo-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          padding: 8px 12px;
          outline: none;
        }

        .add-grupo-input:focus {
          border-color: rgba(255, 68, 68, 0.35);
        }

        .add-grupo-input::placeholder {
          color: var(--muted);
        }

        .add-grupo-btn {
          background: rgba(255, 68, 68, 0.08);
          border: 1px solid rgba(255, 68, 68, 0.25);
          color: var(--red);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .add-grupo-btn:hover {
          background: var(--red);
          color: #fff;
        }

        .bloco[data-bloco='receitas'] .bloco-icon {
          background: rgba(0, 200, 83, 0.12);
        }

        .bloco[data-bloco='receitas'] .bloco-titulo,
        .bloco[data-bloco='receitas'] .bloco-total {
          color: var(--green);
        }

        .bloco[data-bloco='pagar-primeiro'] .bloco-icon {
          background: rgba(255, 215, 0, 0.1);
        }

        .bloco[data-bloco='pagar-primeiro'] .bloco-titulo,
        .bloco[data-bloco='pagar-primeiro'] .bloco-total {
          color: var(--gold);
        }

        .bloco[data-bloco='doar'] .bloco-icon {
          background: rgba(100, 180, 255, 0.1);
        }

        .bloco[data-bloco='doar'] .bloco-titulo,
        .bloco[data-bloco='doar'] .bloco-total {
          color: #64b4ff;
        }

        .bloco[data-bloco='contas'] .bloco-icon {
          background: rgba(255, 68, 68, 0.1);
        }

        .bloco[data-bloco='contas'] .bloco-titulo,
        .bloco[data-bloco='contas'] .bloco-total {
          color: var(--red);
        }

        .bloco[data-bloco='investimentos'] .bloco-icon {
          background: rgba(180, 100, 255, 0.1);
        }

        .bloco[data-bloco='investimentos'] .bloco-titulo,
        .bloco[data-bloco='investimentos'] .bloco-total {
          color: #b464ff;
        }

        .bloco[data-bloco='desfrute'] .bloco-icon {
          background: rgba(255, 140, 0, 0.1);
        }

        .bloco[data-bloco='desfrute'] .bloco-titulo,
        .bloco[data-bloco='desfrute'] .bloco-total {
          color: #ff8c00;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(80px);
          background: var(--green);
          color: #000;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 10px;
          transition: transform 0.3s ease;
          z-index: 999;
          pointer-events: none;
        }

        .toast.show {
          transform: translateX(-50%) translateY(0);
        }

        .loading-screen {
          position: fixed;
          inset: 0;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          flex-direction: column;
          gap: 16px;
        }

        .loading-screen .spinner {
          width: 28px;
          height: 28px;
          border: 2px solid var(--border);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-screen p {
          font-size: 13px;
          color: var(--muted);
        }
      `}</style>
    </>
  );
}
